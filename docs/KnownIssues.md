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

**`node-sass` is deprecated but still load-bearing** — `sass-loader` needs either `node-sass` or
`sass` (dart-sass) installed to actually compile the `.scss` files in this repo, and only `node-sass`
is currently present. Migrating to `sass` is a real (if probably mechanical) task, not a version
bump — dart-sass's syntax is close to but not 100% compatible with node-sass's on some edge cases.

## Exotic (git-pinned) dependencies need a per-package decision, not a version bump

5 dependencies resolve to a git ref rather than a registry version (`yarn outdated` calls these
`exotic` and can't give a real "how far behind" comparison): `jQuery-QueryBuilder`,
`jQuery-QueryBuilder-Elasticsearch`, `react-stepzilla`, `react-yearly-calendar`, `tui-calendar`.
None are pinned to a commit SHA (branch/tag refs instead), so each can change underneath the app
with zero `package.json`/lockfile signal.

For each one the real question isn't "bump the version" but: why was it forked, is the fork's patch
still needed, is upstream (or the fork itself) still maintained, and does it make more sense to
un-fork (go back to a pinned upstream release), patch-and-pin (keep the fork but pin it to an exact
commit), or replace the library entirely. Researched 2026-08-27 via `gh api` (fork metadata +
`compare` between fork and upstream default branches) — one at a time, starting wherever the
maintenance risk is highest:

- **`tui-calendar`** (`SIXMON/tui.calendar` fork of `nhn/tui.calendar`) — **highest effort to
  reconcile**. Upstream is healthy and active (12.7k stars, pushed 2024-06, 208 open issues) but the
  fork is **1426 commits behind** it and has **14 commits of real, app-specific behavior** on top
  ("Changes to conform to ziggy data model" x2, plus scheduling-precision tweaks: 15-minute steps,
  minimum schedule duration, "nearest thresholds", drag constants). This isn't a trivial patch that
  could just be dropped — the app's actual calendar behavior depends on it. Un-forking means
  re-implementing all 14 commits' behavior against a version 1426 commits newer; worth scoping
  carefully before starting.
- **`react-yearly-calendar`** (`SIXMON/react-yearly-calendar` fork of `BelkaLab/react-yearly-calendar`)
  — **highest maintenance risk**. Upstream is **archived** (dead since ~2020). Fork carries 4 commits
  ahead including a real behavioral change ("Change from civil year to range period") and is 17
  commits behind an upstream that will never move again. Since upstream is dead either way, "un-fork"
  isn't really an option — this is a keep-and-pin-to-a-commit-SHA vs. replace-the-library decision.
- **`react-stepzilla`** (`SIXMON/react-stepzilla` fork of `newbreedofgeek/react-stepzilla`) — upstream
  is alive but slow (615 stars, last pushed 2022-12). Fork has 3 real commits ahead (nav-state bug
  fixes for dynamic step counts) and is only 2 commits behind — the smallest gap of the four forks,
  and the patches look like legitimate upstreamable bug fixes rather than app-specific behavior.
  Reasonable candidate to try upstreaming the fix and dropping the fork.
- **`jQuery-QueryBuilder`** (`SIXMON/jQuery-QueryBuilder` fork of `mistic100/jQuery-QueryBuilder`) —
  upstream is actively maintained (1.7k stars, pushed 2024-11). Fork is trivial: 1 commit ahead ("Add
  span to input labels"), 48 commits behind. Lowest-risk candidate to just drop the fork and go back
  to a pinned upstream release, possibly re-adding the one small patch if still wanted.
- **`jQuery-QueryBuilder-Elasticsearch`** (`piotch/jQuery-QueryBuilder-Elasticsearch`) — not a fork of
  anything (independent project, no parent repo). Abandoned since 2016 (5 open issues, no activity
  since). No drop-in replacement found via a quick search — this one may need to be vendored/inlined
  or reimplemented in-house rather than either "un-forked" or swapped for an alternative package.

Whatever the per-package decision, pin to an exact commit SHA (or a real npm release) rather than a
branch ref in the meantime — that alone removes the "can silently change under us" risk even before
the fork-vs-replace decision is made.

## Devise `.mjml` mailer templates are dead code

Found 2026-08-27 while extracting i18n keys for `feature/i18n-04-devise-and-public-pages`.
`app/views/devise/mailer/confirmation_instructions.mjml` and
`reset_password_instructions.mjml` sit next to the `.html.erb` versions of the same mailer
actions, but no `mjml`/`mjml-rails` gem is in the `Gemfile` or `Gemfile.lock` — nothing in the
app can compile MJML markup into HTML at render time, and the mailers themselves
(`app/mailers/*.rb`) only ever reference `reset_password_instructions`/`confirmation_instructions`
without an explicit `.mjml` format, so Action Mailer would just pick the `.html.erb` template.
Translated their strings anyway (see `views.devise.mailer.*_mjml` keys in
`config/locales/{fr,en}.yml`) since removing them wasn't in scope for that branch, but they're a
strong candidate for outright deletion — confirm nothing renders them, then delete both `.mjml`
files and their now-unused locale keys.

## Stale "Ziggy" product name in a translated string

Found 2026-08-27, same i18n-04 branch. `reset_password_instructions_mjml.mj_title` (in both
`config/locales/fr.yml` and `en.yml`) still reads `"Ziggy - ..."` — carried over verbatim from
the pre-existing `.mjml` source file rather than introduced by the i18n extraction. Elvis was
renamed from "Ziggy" a while ago (see `CLAUDE.md`'s "formerly Ziggy"); either fix the string to
"Elvis" or delete it along with the dead `.mjml` templates above.

## i18n-tasks baseline noise (2 missing / 22 unused keys)

`bundle exec i18n-tasks health` reports these as of 2026-08-27 (post i18n-04, confirmed
independently and originally flagged by the backend-specialist agent that did the i18n-04 work),
all pre-existing and unrelated to that branch's changes:
- **Missing (2)**: `date.month_names` (no locale defines it — probably meant to lean on
  `rails-i18n`'s own `date.month_names`, check for a typo'd key or a stale override), and
  `activerecord.errors.models.user.attributes.password_confirmation.confirmation` in `en.yml`
  (only `fr.yml` has it).
- **Unused (22)** — full list from `bundle exec i18n-tasks unused`:
  - `en`: `date.formats.date_month_concise`, `errors.messages.already_confirmed`,
    `errors.messages.confirmation_period_expired`, `errors.messages.expired`,
    `errors.messages.not_found`, `errors.messages.not_locked`, `errors.messages.not_saved`,
    `time.formats.date_month_concise`, `time.formats.day`, `time.formats.long_date`,
    `time.formats.short_time`
  - `fr`: `activerecord.attributes.activity_ref.activity_type_list.{actions_culturelles,cham,
    child,chorale_ma,eveil_musical}`, `activerecord.errors.models.user.attributes.
    password_confirmation.confirmation`, `date.formats.date_month_concise`,
    `time.formats.{date_month_concise,day,long_date,short_time}`

  The `errors.messages.*` (`en`) entries are `devise.en.yml` overrides that duplicate
  `devise-i18n`'s stock English text — likely safe to delete rather than translate. The
  `activerecord.errors.models.user.attributes.password_confirmation.confirmation` key is flagged
  **both** missing-in-`en` and unused-in-`fr` — i.e. nothing in the code actually renders it in
  either language, suggesting the password-confirmation mismatch error is raised some other way
  (custom `validate` with a literal string?) and this YAML key is simply dead, a stronger
  candidate for deletion than for adding an `en` translation. The `time`/`date` `formats.*` and
  `activity_type_list.*` entries may be false positives — i18n-tasks' static scan can't see keys
  built dynamically (e.g. `translate_enum`, `I18n.l(..., format: :long_date)`) — so verify each
  with a grep before deleting anything. Worth a dedicated sweep once more of the extraction
  branches (05/06) land.

## `bundle exec i18n-tasks` crashes on Ruby 3.3.5+ unless `logger` is pre-required

Found 2026-08-27 verifying the i18n-04 branch. `bundle exec i18n-tasks health` (and presumably
`missing`/`unused`) raises `NameError: uninitialized constant ActiveSupport::LoggerThreadSafeLevel::Logger`
before printing anything. Root cause: Ruby demoted `logger` from a default gem to a bundled gem
starting around 3.3.5/3.4, so it's no longer implicitly available. This app's `Gemfile` already
has `gem "logger"` (line 10) for exactly this reason, but that only puts it on the bundler load
path — it doesn't `require` it. Booting the full Rails app works fine (`bin/rails`,
`bundle exec rspec`) because something in Rails' own boot sequence requires `logger` before
`activesupport` needs it; the standalone `i18n-tasks` CLI never boots Rails, so nothing requires
it first, and `activesupport-6.1.7.10`'s `logger_thread_safe_level.rb` references the bare
`Logger` constant assuming it's already loaded.

**Workaround**: `RUBYOPT="-rlogger" bundle exec i18n-tasks health`. `bundle exec rubocop` doesn't
need this (it requires `logger` itself internally). Worth either documenting the `RUBYOPT` prefix
next to the `i18n-tasks` command in `CLAUDE.md`, or fixing it at the source (e.g. an
`.i18n-tasks.yml`-adjacent Ruby require, or filing/checking upstream `i18n-tasks` for a fix) so
nobody hits this cold again.

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
