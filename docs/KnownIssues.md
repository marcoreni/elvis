# Known issues

Tracked bugs/gaps that are known but deliberately not fixed yet, with enough detail to pick back up
later. When one gets fixed, remove its entry (the fix's commit message/PR is the record, not this
file).

## Minitest suite (`test/`) is substantially broken

Found 2026-08-26 while getting the RSpec suite fully green (see the "fix: correct
ActivityRefPricing#overlaps?" commit history around that date). Unrelated to that work — pre-existing,
not caused by anything changed then. Deliberately left alone; picking these apart is a separate,
larger task.

Running `bin/rails test`:

- **All three `test/features/*_test.rb` files fail to even load.** They use Capybara's spec DSL at
  the top level (`feature "..." do ... scenario "..." do ... end end`), but the installed
  `minitest-rails` gem only aliases `scenario`/`background`/`given` onto
  `ActionDispatch::SystemTestCase` (see
  `.../gems/minitest-rails-6.1.1/lib/minitest/rails/capybara.rb`), not onto a plain `describe` block
  (which is what `feature` aliases to). Every `scenario` call raises `NoMethodError` at load time.
  Fixing this needs either rewriting these as system tests properly inheriting
  `ActionDispatch::SystemTestCase` (with a working headless-browser driver configured), or dropping
  the Capybara spec-DSL styling for plain Minitest assertions.
- **`test/models/users_test.rb`: 10/10 tests error.** `User.create(first_name:, birthday:, email:)`
  without `last_name` raises `NoMethodError: undefined method 'strip!' for nil` from
  `User#strip_names` (`app/models/user.rb`) — `last_name.strip!`/`first_name.strip!` aren't nil-guarded,
  unlike the `email&.strip!` line right next to them. This looks like a real app bug, not just an
  incomplete test fixture: any code path that creates a `User` without a `last_name` (e.g. a
  placeholder "attached" family member, similar to the pattern in
  `app/services/activity_applications/tes_import_handler.rb`) would crash outright instead of hitting
  a normal presence-validation error, if `strip_names` runs before `last_name` is set.
- **`test/models/due_payment_test.rb`: 6/6 tests error.** Calls `DuePayment._test_mark_unpaid(...)`,
  a method that doesn't exist on `DuePayment` at all — likely a stale reference to a renamed/removed
  method.
- **`test/models/time_interval_test.rb`: partial errors** (some assertions fail with raw object dumps
  printed via `pp`, not yet triaged further).
- **`test/controllers/home_controller_test.rb`: passes.**

No CI currently runs either test suite (see `.github/workflows/`, which only has an auto-release
workflow) — that's part of why this drifted this far without being noticed.

## Frontend dependencies: major-version bumps still pending

Surveyed 2026-08-27 (`yarn outdated`, each entry checked individually — see git history around that
date for the accompanying unused-dependency cleanup and in-range bumps, both already done). What's
left all requires an explicit major-version jump and, in several cases, code changes — tackle one
at a time rather than in bulk, starting with React since most of the rest is either downstream of it
or independent of it.

**React 16 → 19 (do this one first)** — `react`/`react-dom` `^16.14.0` → 19.x. Three majors behind,
crossing several real breaking boundaries, not just a version bump:
- Legacy string refs (`ref="foo"`) and the legacy context API (`contextTypes`/`getChildContext`) are
  both removed in 19 — need to grep the ~118 class components (see `docs/I18n-Roadmap.md`'s context
  count) for both before attempting this.
- `ReactDOM.render` is gone from 18+ in favor of `createRoot`. `react_ujs` (currently 2.7.1, latest
  3.3.1) needs bumping in lockstep — it already tries to resolve `react-dom/client` internally
  (`node_modules/react_ujs/react_ujs/src/reactDomClient.js`), which is why a production
  `bin/shakapacker` build currently prints a harmless
  `Module not found: Error: Can't resolve 'react-dom/client'` warning; that's dormant code in the
  installed react_ujs version waiting for React 18+.
- React 18 also changed effect/StrictMode timing enough to surface latent class-component lifecycle
  bugs that never showed up under 16's behavior.
- Consider staging this (16 → 18 first, prove it out, then 18 → 19) rather than one big-bang jump.
- `@testing-library/react` is deliberately pinned at `^12.1.5` *because* it's the last major
  supporting React 16 (see the Vitest setup commit) — once React moves, this should move with it
  (latest is 16.3.2, needs React 18+).

**Downstream of the React bump** (all currently pinned well below latest, but bumping most of these
before React itself would just be churn): `react-select`, `react-table`, `react-toastify`,
`react-datepicker`, `react-loader-spinner`, `react-dropzone`, `react-autosuggest`, `react-switch`,
`react-final-form` + `react-final-form-arrays`, `@wojtekmaj/react-daterange-picker`.

**Independent of React, each a real API-surface jump**:
- `sweetalert2` 7.33.1 → 11.26.25 — dropped the old callback-based `swal({...})` API for promises
  somewhere in the 9.x line; every call site (dozens, via `frontend/tools/api.js` and components
  directly) would need reviewing.
- `bootstrap` 4.6.2 → 5.3.8 — drops the jQuery dependency, markup/class changes.
- `isomorphic-dompurify` 0.20.0 → 3.23.0.
- `prettier` 1.19.1 → 3.9.6 — different default formatting rules; bumping would reformat large parts
  of the codebase in one commit.

**Build tooling, moderate risk**: `shakapacker` 8→10, `webpack-cli` 4→7, `webpack-dev-server` 4→6,
`babel-loader` 8→10, `compression-webpack-plugin` 9→12, the whole `@babel/*` toolchain 7→8.

**Smaller/isolated, lower priority**: `jquery` 3→4, `tui-code-snippet`, `webpack-assets-manifest`,
`webpack-merge`, `css-minimizer-webpack-plugin` 7→8, `sass-loader` 16→17, `postcss-preset-env` 10→11.

**Blocked on this repo's Node version, not just "not yet bumped"**: `postcss-import` 16→17 and
`jsdom` 26→30 both require Node ≥22 — this repo's `engines.node` is pinned to `^20.9.0`. Don't bump
either past their current major without bumping Node first (same wall we hit picking versions for
the Vitest/jsdom setup and `postcss-import` itself).

**Not really "outdated," just unpinned** — these resolve to a git ref, not a registry version, so
`yarn outdated` reports them as `exotic` rather than giving a real comparison: `jQuery-QueryBuilder`,
`jQuery-QueryBuilder-Elasticsearch`, `react-stepzilla`, `react-yearly-calendar`, `tui-calendar`.
Nothing pins these to a specific commit, so they can change underneath the app without any
`package.json`/lockfile change showing it — worth pinning to a commit SHA at some point regardless
of the version-bump work above.

**`node-sass` is deprecated but still load-bearing** — `sass-loader` needs either `node-sass` or
`sass` (dart-sass) installed to actually compile the `.scss` files in this repo, and only `node-sass`
is currently present. Migrating to `sass` is a real (if probably mechanical) task, not a version
bump — dart-sass's syntax is close to but not 100% compatible with node-sass's on some edge cases.

## Rubocop backlog

`rubocop` was only added as a Gemfile dependency 2026-08-26 (see git history around that date) — it
had never actually been run against this codebase before, despite `CLAUDE.md` documenting
`bundle exec rubocop` as the lint command. Running it now surfaces a real backlog, not yet triaged
or cleaned up. Spotted so far (not exhaustive — nobody's run a full-codebase pass):

- `app/controllers/application_controller.rb`: `Style/RedundantSelf` (`self.call_render`),
  `Style/GuardClause`, `Style/NumericPredicate` (`nb == 0` instead of `nb.zero?`),
  `Layout/EmptyLinesAroundClassBody`, a couple of `Layout/LineLength` overflows — all pre-existing,
  predate any of the i18n branches.
- New spec files added during the i18n review passes (e.g.
  `spec/controllers/parameters/localization_parameters_controller_spec.rb`) already carry minor
  offenses of their own: missing `# frozen_string_literal: true`, `Style/WordArray`,
  `Style/BlockDelimiters` on multi-line `expect { ... }` blocks, a few `Layout/LineLength` overflows
  from long example descriptions.

Worth a dedicated `bundle exec rubocop -a` (or manual) cleanup pass across the whole codebase rather
than fixing these piecemeal as they're noticed — deferred here for the same reason as the frontend
dependency bumps above.
