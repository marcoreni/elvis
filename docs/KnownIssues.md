# Known issues

Tracked bugs/gaps that are known but deliberately not fixed yet, with enough detail to pick back up
later. When one gets fixed, remove its entry (the fix's commit message/PR is the record, not this
file).

## Minitest feature specs (`test/features/`) can't load — Capybara spec DSL, not a browser/asset gap

Found 2026-08-26 while getting the RSpec suite fully green, root-caused 2026-08-27 while fixing the
rest of `test/models`/`test/controllers` (see below — all of those are now green, this is the one
remaining Minitest gap). All three `test/features/*_test.rb` files use Capybara's spec DSL at the
top level (`feature "..." do ... scenario "..." do ... end end`), but the installed `minitest-rails`
gem only aliases `scenario`/`background`/`given` onto `ActionDispatch::SystemTestCase` (see
`.../gems/minitest-rails-6.1.1/lib/minitest/rails/capybara.rb`), not onto a plain `describe` block
(which is what `feature` aliases to). Every `scenario` call raises `NoMethodError` at load time —
`bin/rails test` (no args) loads all three, so this one crash blocks every other Minitest file from
running unless `test/features` is excluded from the run.

Confirmed this is *not* about a missing browser driver: only the bare `capybara` gem is in the
Gemfile (no `selenium-webdriver`/`cuprite`/etc.), so `Capybara.default_driver` is the headless,
JS-free `:rack_test` — plenty for what these 3 files actually do (`visit`, `fill_in`, `click_on`,
text assertions; no JS interaction). The fix is exactly the DSL swap already scoped here: drop
`feature`/`scenario`/`must_have_content` for plain `test "..." do` + `Capybara::Minitest::Assertions`
(`assert_text`/`assert_no_text`), and make sure whatever base class is used actually exposes route
helpers and a configured `Capybara.app` — right now nothing in `test/test_helper.rb` sets that up
(only `require "minitest/rails/capybara"`), so this still needs someone to wire up the Rails/Capybara
integration properly, not just rename a few methods. Left alone here rather than risk a fix that
"passes" without actually driving requests through the app. Two of the three files
(`can_create_user_test.rb`, most of `can_sign_in_test.rb`) have all their `scenario` bodies already
commented out, so the real payoff of fixing this is small until someone also writes the tests back in.

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

## `devise/passwords/edit.html.erb` may be an orphaned view

Found 2026-08-27, same investigation. The reset-password link Devise's own flow sends
(`send_reset_password_instructions`) is rendered by `DeviseMailer#reset_password_instructions`
(`app/mailers/devise_mailer.rb`), and its email template builds the link with `edit_password_url`
(a custom top-level route, `/u/edit_password` → `UsersController#edit_password`) — not
`edit_user_password_url`, the Devise-generated route (`/u/password/edit` →
`PasswordsController#edit`, inherited unmodified from `Devise::PasswordsController`) that actually
renders `app/views/devise/passwords/edit.html.erb`. No `edit_user_password_path`/`_url` call exists
anywhere in `app/` (grepped `app --include="*.rb" --include="*.erb"`). It's possible some
DB-stored `NotificationTemplate` (Liquid/WYSIWYG content, outside static grep's reach — see
`docs/I18n.md`'s "hors périmètre") links to it, so this isn't confirmed dead the way the deleted
`.mjml` templates were. Checked the local dev/test DB directly (`NotificationTemplate.where("body
ILIKE ?", "%edit_password%")` and similar for `password/edit`/`edit_user_password`) — zero matches,
but that DB only has 1 seed row, so this doesn't rule out a production `NotificationTemplate`
referencing it. Still worth a production-data check before deleting this view.

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

## "Edit" action label has three divergent i18n keys

Surfaced 2026-08-28 in the i18n-06 evaluation review. The single UI string "Edit" (French
"Éditer") now has three separate translation keys, added across different branches without a shared
one existing yet:

- `common.actions.edit` — `"Éditer"` / `"Edit"` (added in i18n-06 for
  `evaluation_level_ref/index.html.erb`)
- `views.users._family.edit_action` — `"Éditer"` / `"Edit"` (i18n-05)
- `views.users.show.edit_link` — `"Editer"` / `"Edit"` (i18n-05) — note the French value is
  **missing its accent**, so it also silently diverges in copy from the other two.

`common.actions.edit` is the intended canonical key going forward. The two `views.users.*` keys
should be pointed at it (and the missing-accent value dropped) in a cleanup pass — not done in
i18n-06 because retrofitting the users views was out of that branch's scope. Same applies to any
other verbatim action-label duplication that predates `common.actions.*` (check `common.actions`
against the `views.*` trees when doing the pass).

## Scaffold views suspected dead — recovery log + removal candidates

Surfaced 2026-08-28 across the i18n-06 evaluation + payments work. Several admin CRUD `resources :x`
declarations have `show`/`create`/`update` routes whose controller actions either don't exist or
`redirect_to`/`render json:` unconditionally, so the matching Rails-scaffold view stubs
(`<h1>X#show</h1>` / `<p>Find me in ...</p>` / 0-byte) look unreachable.

**A 500 (`AbstractController::ActionNotFound`) or an unconditional redirect does NOT prove the
route is unused.** This app prepends plugin routes *before* its own (`CLAUDE.md` → plugin system:
"plugin routes are deliberately prepended ... so plugins can override core behavior"), so an
activated plugin can supply a real `show`/`update` that never appears in `app/`. Add `rescue_from`,
`method_missing`, `respond_to` fallbacks, external API callers, and bookmarked URLs, and "returns
500 in my local checkout" is weak evidence. Treat everything below as *unconfirmed* and prefer
recovery over deletion until someone audits plugins + prod logs.

### Already deleted (recover if in doubt)

- `app/views/evaluation_level_ref/create.html.erb`, `app/views/evaluation_level_ref/update.html.erb`
  — deleted in `feature/i18n-06-extract-evaluation` (commit `48a6208`, now merged to `develop` via
  `4a32bac`). Reason given at the time: `create`/`update` `redirect_to` unconditionally.
  **Recover with** `git show 48a6208^:app/views/evaluation_level_ref/create.html.erb`
  (and `...update.html.erb`).

### Not deleted — left in place, flagged for a later audit

- `app/views/evaluation_level_ref/show.html.erb` — empty `def show; end` still renders it.
- `app/views/payment_statuses/show.html.erb` (0 bytes) — no `show` action on
  `PaymentStatusesController`; `resources :payment_statuses` still routes `GET /payment_statuses/:id`.
  Was briefly deleted in `feature/i18n-06-extract-payments`, then **restored** per the
  recover-don't-delete policy.
- `app/views/due_payment/update.html.erb` — `DuePaymentController#update` does `render json:`
  unconditionally. Same: briefly deleted in that branch, then restored.
- `payment_method` also has no `show` action while `resources :payment_method` routes `show`.

When someone picks this up: audit activated plugins' route files and prod request logs for these
paths first; only then drop the dead actions/views and tighten the route declarations with
`only:`/`except:` in `config/routes.rb`.

## i18n PRs #7–#11 not reviewed by a specialized code-review agent

The i18n extraction PRs were reviewed **inline by the assistant only** (read the diff, run the
test suites, check locale-key parity) — not by the dedicated `/code-review` skill / specialized
review agent. That inline process has already missed things a structured pass would likely have
caught (e.g. the `for`/`id` label mismatch repeated across branches, the `hh` vs `HH` date-format
bug, the `{{count}}` vs `{{n}}` plural-resolution inconsistency).

**Action:** re-review these with the specialized agent, most-recent first:

- PR #11 `feature/i18n-06-payments-general-shell` — specialized `/code-review` run 2026-08-28:
  **no correctness bugs**; one pre-existing cleanup finding logged below (`CheckList` dead
  `message` state). Done.
- PR #10 `feature/i18n-common-react-table-keys` (merged) — **not** specialized-reviewed.
- PR #9  `feature/i18n-06-extract-payments` (merged) — **not** specialized-reviewed.
- PR #8  `feature/i18n-06-extract-evaluation` (merged) — **not** specialized-reviewed.
- (PR #7 `feature/i18n-05-extract-users`, merged — also inline-only; lower priority, it had the
  most inline scrutiny.)

**Process change:** every future i18n PR (payments lots 2b/2c/2d, planning, activities,
courses/formules, parameters) must be run through the specialized `/code-review` agent before
merge, not just an inline read.

## `generalPayments/GeneralPayments.jsx` — likely-dead imports

`GeneralPayments.jsx` imports `swal` (`sweetalert2`) and `csrfToken` (`../utils`) but its body is
only a `TabbedComponent` with four tab definitions — neither symbol appears to be used. Pre-existing
(not introduced by the i18n-06 lot-2a extraction); flagged during that PR's review. Verify and
remove if genuinely unused. Low priority.

## `generalPayments/CheckList.jsx` — dead `message` state

`CheckList` initializes `this.state.message = { title, content, isEmail, isSMS }` (title now seeded
from `props.t("general.reminderDefaultTitle")`), but the component never renders or reads it — it
has no `MessageModal` and no send-reminder path, unlike its sibling `PaymentScheduleList` it was
evidently copied from. Found by the specialized `/code-review` of PR #11 (2026-08-28). Pre-existing;
the i18n-06 lot-2a change only re-touched the `title` line. Safe to drop the whole `message` state
block (and the `props.t` call with it) in a cleanup pass. Low priority.

## generalPayments tables freeze translated column headers at construct time

`DuePaymentList.jsx` and `PaymentList.jsx` (and the smaller `PaymentScheduleList` filter setup)
build their react-table `columns` array — each `Header: t(...)` — in the **constructor**, using the
mount-time `t`, and store it in `this.state.columns`. `render()` reads `this.state.columns`, so the
headers (and `state.message.title`, seeded from `t("general.reminder.defaultTitle")`) never
re-derive when i18next fires `languageChanged`.

This is **currently harmless**: the language switcher (`LocaleController#update`) does a full
server-side PATCH + redirect, so every React island is re-mounted in the new language and no
component lives across an in-page language change (confirmed by the specialized reviews of PR #11
and PR #12). It becomes a real bug the moment anything calls `i18n.changeLanguage(...)` in-page, or
a second locale-aware island renders on the same page in a different language.

Fix when it matters: move the `columns` build into `render()` (as was done for
`SubPaymentList.jsx` in lot 2a) — the Filter/Cell closures already close over `this`, so it's
mechanical but touches ~200 lines in each 1000+-line file, hence deferred.

## French typos preserved verbatim during i18n extraction — clean up the locale files

The i18n branches copy every French string **verbatim** into the locale files (no copy changes
during extraction — see the `common.confirm.sure` episode). Several source strings had typos, now
sitting in `frontend/locales/fr/payments.json` (and a few in `config/locales/fr.yml`). Once the
payments i18n lots are all merged, do one pass over the locale files to fix these — it's a pure
value edit, no component or key changes:

`frontend/locales/fr/payments.json`:
- `general.statusEditFailed` — "Echec" → "Échec"
- `general.subPayments.columns.method` — "Mode de réglement" → "Mode de règlement"
- `general.subPayments.columns.checkIssuer` — "Emmeteur du Chèque" → "Émetteur du chèque"
- `general.checks.paymentDateLabel` / `.paymentDateTooltip` — "Date de réglement" → "Date de règlement"
- `userPayments.paymentsList.bulkEdit` — "Edition de masse" → "Édition de masse"
- `userPayments.paymentsList.bulkEditTitle` — "Edition de règlements" → "Édition de règlements"
- `userPayments.paymentsList.editPaymentTitle` — "Edition Règlement" → "Édition du règlement"
- `userPayments.paymentsList.editButton` — "Editer" → "Éditer"
- `userPayments.paymentsList.dueNumber` — "Echéance N°{{n}}" → "Échéance n° {{n}}"
- `userPayments.paymentsList.selectPaymentMethod` — "Selectionnez un mode de paiement" → "Sélectionnez un mode de paiement"
- `userPayments.paymentsList.selectDue` — "Selectionnez une échéance" → "Sélectionnez une échéance"
- `userPayments.paymentsList.checkIssuerLabel` — "Emmeteur du Chèque" → "Émetteur du chèque"
- `userPayments.paymentsList.firstCheckNumberLabel` — "…seront incrémenté automatiquement" → "…seront incrémentés automatiquement"

Also re-scan the whole `frontend/locales/fr/` + `config/locales/fr.yml` when doing this (grep for
`Edition\b`, `Editer\b`, `Selectionn`, `réglement`, `Echéance`, `Echec`, `Emmeteur`, `Precedent`);
the list above is only what was noticed in passing, not an exhaustive audit. The English side of
these keys is already spelled correctly.
