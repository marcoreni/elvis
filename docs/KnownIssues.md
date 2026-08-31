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
- `app/views/activity_ref/{create,update}.html.erb` — 85-byte Rails-scaffold stubs
  (`<h1>ActivityRef#create</h1>`). `ActivityRefController#create`/`#update` always `render json:`,
  so unreachable. Left untouched by i18n-06 activities lot 1.

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

## `formules/NewFormule.jsx` — dead, superseded by `EditFormule.jsx`

`frontend/components/formules/NewFormule.jsx` (a standalone default-export function component,
~460 lines) plus its helper `NewFormulePricingDataService.js` look like an earlier "create" screen
that `EditFormule.jsx` replaced — `EditFormule` handles both create and edit via `formule.id ?`,
and it's the only formule editor mounted (`app/views/formules/{new,edit,show}.html.erb` all
`react_component("formules/EditFormule", …)`). `NewFormule` (the component) is imported/mounted
**nowhere**; only `NewFormulePricingDataService` is still referenced (by `EditFormule.jsx`, for the
unsaved-formule pricing path). Surfaced 2026-08-29 during the i18n-06 `formules` extraction — left
**untranslated and in place** per the recover-don't-delete policy above. Verify against activated
plugins / prod logs, then delete `NewFormule.jsx` (keep `NewFormulePricingDataService.js`). Low
priority.

## `planning/Calendar.jsx` — dead `ConflictDisplayItem`; tui-calendar strings frozen at mount

Surfaced 2026-08-30 during the i18n-06 planning lot 3b (`Calendar.jsx`) extraction:

- `ConflictDisplayItem` (component, ~55 lines, strings "Voir le conflit" / "Résolu") is
  referenced **only** from inside a `{/* … */}` JSX comment block in `CalendarControls`, so it
  never renders. Left untranslated and in place per the recover-don't-delete policy; verify and
  delete along with the commented conflict-dropdown block.
- `week.daynames` is passed to the `tui-calendar` constructor once in `componentDidMount` (a
  frozen array), and the `monthGridHeaderExceed` / `weekDayname` template functions capture the
  mount-time `t`. So after an in-page `i18n.changeLanguage`, the day-name headers, "N autres"
  and "Présences" stay in the old language while `CalendarControls` (fresh `t` each render) and
  the `time:` schedule-title template (reads `this.props.t`) switch. Same class as the
  generalPayments "column headers frozen at construct time" note below, and harmless for the
  same reason: `LocaleController#update` does a full server reload, so no calendar instance
  outlives a locale change. Fix (if it ever matters) = destroy + recreate the tui-calendar
  instance on `languageChanged`.

## `planning/practice_planning/PracticePlanning.jsx` — FullCalendar `locale="fr"` is inert

Noted 2026-08-30 (i18n-06 lot 6). `PracticePlanning` passes `locale="fr"` to `<FullCalendar>`,
but **no FullCalendar locale data is imported anywhere** (`@fullcalendar/core/locales/fr` /
`locales-all` — grep is empty). So `queryLocale(["fr"])` falls back to the built-in English
locale table: month/day names and the toolbar title still render French (those go through
`Intl.DateTimeFormat`, locale-table-independent), but FullCalendar's own chrome — the
`resourceTimelineDay` / `resourceTimelineWeek` view buttons, `allDayText`, `moreLinkText`,
`noEventsText` — renders in **English** even in the French UI. That is almost certainly why
`buttonText={{today: t("practice.today")}}` is patched in by hand. `locale="fr"` is also
hardcoded, so it won't follow `i18n.changeLanguage` (same frozen-locale class as the
`columns`/`daynames` notes here). Fix = `import frLocale from "@fullcalendar/core/locales/fr"`
and drive `locale` from the active i18n language.

## `planning/activity_management/` — the whole subtree is dead except `withSave`

Confirmed 2026-08-30 during i18n-06 planning lot 6. `activity_management/index.jsx` exports two
things:

- `withSave` (named) — **live**, imported by `ActivityDetailsModal.jsx`.
- `ActivityManagement` (default `class`, ~660 lines) — mounted **nowhere** (`react_component`
  never names it; no `.jsx` imports the default). It is the only consumer of its siblings
  `attendance_table.jsx`, `activity_edition.jsx`, `edit_group_name_input.jsx`,
  `recurrences_editor.jsx`, `teacher_covering_editor.jsx`. `teachers_editor.jsx` is imported by
  nothing at all.

`ActivityDetailsModal.jsx` carries its own inline `AttendanceTable` / `ActivityEdition` /
`EditGroupNameInput` / `TeacherCoveringEditor` / `TeachersEditor` — those are the live ones. This
subtree is an abandoned extract-into-files refactor. i18n lot 6 left it **untranslated** (per the
recover-don't-delete policy); when someone audits it, keep `withSave` and delete the rest.

`withSave`'s `label = "Enregistrer"` default param is still a hardcoded string. There are 7
`withSave(` call sites total; the 3 **live** ones (all in `ActivityDetailsModal.jsx` after lot 5,
`:965`/`:1013`/`:1025`) each pass an explicit translated `label`, so the default is unreachable
from live code. The other 4 are in the dead `activity_management/index.jsx` (2 of them pass no
`label`). If the subtree is kept, change the default to `null`.

## `planning/ActivityDetailsModal.jsx` — dead `TeachersEditor` + `renderTeacherSelection`

Surfaced 2026-08-30 during the i18n-06 planning lot 5 extraction. Both are defined but never
rendered/called:

- `TeachersEditor` (module-level function component, ~130 lines) — no `<TeachersEditor …/>` site
  anywhere. The live equivalent is almost certainly
  `frontend/components/planning/activity_management/teachers_editor.jsx` (lot 6).
- `ActivityDetailsModal.renderTeacherSelection()` (class method) — never called from `render()`
  or elsewhere.

Both had their strings extracted anyway (given `useTranslation` / `const { t } = this.props`
respectively) so they stay consistent if revived; the `t(...)` calls in them are inert. Verify
against `activity_management/*` and prod usage, then delete.

**When deleting `TeachersEditor`**: its keys `planning.activityModal.teachersEditor.{teacher,
main,remove,needMainTeacher,cannotRemoveMain}` go with it, but `planning.activityModal.noMainTeacher`
does **not** live under that subtree — it's used by the live `ActivityEdition.render()`. Leave it.

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

Same pattern (added by i18n-06 activities lot 1): `activities/ActivityRefKind.jsx` and
`activities/Instruments.jsx` build `this.state.columns` with `this.props.t(...)` `Header`s in the
constructor. Harmless for the same reason (full-reload locale switch); `BaseDataTable` reads
`this.state.columns` so moving the build needs the same care.

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

`config/locales/fr.yml` (added by feature/i18n-06-extract-planning lot 1):
- `views.planning.index_for_rooms.new_room` — "Creer une nouvelle salle" → "Créer une nouvelle salle"
- `views.planning.show_availabilities_for_date.lock_link_message` — "…vraiment verouiller le planning…" → "…vraiment verrouiller le planning…"
- `views.planning.show_for_conflict.heading` — "Resolution du conflit" → "Résolution du conflit"

`frontend/locales/fr/planning.json` (added by feature/i18n-06-extract-planning-modals, lot 2a):
- `studentModal.title` — "Selection" → "Sélection" (missing accent; preserved verbatim from
  `StudentModal.jsx`)

Accent fixes **already applied** in `frontend/locales/fr/planning.json` during
feature/i18n-06-extract-planning-modals-2 (lot 2b) — the source spellings were corrected rather
than preserved, for consistency with the `evaluationModal.student` = "Élève" unification in the
same lot (the `EvaluationModal.jsx` source had both "Elève" and "Élève"):
- `kinds.evaluation` — source "Evaluation" → "Évaluation"
- `multiViewModal.students` — source "Elèves" → "Élèves"
- `evaluationModal.student` — source "Elève"/"Élève" → "Élève"

`frontend/locales/fr/planning.json` (added by feature/i18n-06-extract-planning-container, lot 4) —
preserved verbatim from `Planning.jsx`:
- `container.modals.slotDetail` — "Detail d'un créneau" → "Détail d'un créneau" (a11y contentLabel)
- `container.modals.slotCreation` — "Creation d'un créneau" → "Création d'un créneau" (a11y contentLabel)
- `container.toasts.updateFailed` — "Echec de la mise à jour" → "Échec de la mise à jour"
- `container.toasts.courseUpdated` = "Le cours est mis à jour !" vs `container.toasts.courseUpdatedShort`
  = "Le cours est mis-à-jour!" — the same message with two different source spellings; unify.

`frontend/locales/fr/planning.json` (added by feature/i18n-06-extract-planning-activity-modal (lot 5)) —
preserved verbatim from `ActivityDetailsModal.jsx`:
- `activityModal.editGroupNameTitle` — "Editer le nom du groupe de cette activité" → "Éditer le nom du groupe de cette activité"
- `activityModal.toBeSpecified` — "A PRECISER" → "À PRÉCISER"
- `activityModal.attendanceTable.student` — "Elève" → "Élève"
- Intentional **trailing spaces** kept verbatim in `activityModal.createCoursesButton`
  ("Créer les cours de cette activité "), `activityModal.createCourseButton` ("Créer ce cours "),
  and `activityModal.teacherChangeWarningLabel` ("Attention : " — a `<b>` prefix). A blanket
  "trim the locale files" pass must not strip these — they glue onto the next word/element.

`config/locales/fr.yml` (added by feature/i18n-06 activities lot 1 — activity_ref / activity_ref_kind
admin CRUD) — preserved verbatim from the ERB/React sources:
- `views.activity_ref.index.destroy_error_title` — source literal is the English word "Error"; fr
  should be "Erreur" (`Error` → `Erreur`)
- `views.activity_ref.edit.heading` — "Editer l'activité \"%{label}\"" → "Éditer l'activité \"%{label}\""
  (missing accent on "Editer")
- `views.instruments.form.label_field` — "Nom_de_l'instrument" → "Nom de l'instrument" (stray underscores)
- `views.activity_ref.new.heading` = "Ajouter une **A**ctivité" while `views.activity_ref.index.add`
  = "Ajouter une **a**ctivité" — same phrase, inconsistent capital, both preserved verbatim

`frontend/locales/fr/courses.json` (added by feature/i18n-06-extract-courses-lot2 —
`AddTeacherForCourse.jsx`):
- `addTeacher.slotBusy` — source template literal read
  `Ce créneau est déjà occupé pour ce professeur:\n     cours de ${activity_ref} de ${start} à ${end}  - ${room}.`
  The newline + indent run and the double space before `-` were whitespace artifacts of the JS
  template literal and were collapsed to single spaces during extraction (no visible change —
  HTML collapses them anyway). The string is otherwise preserved verbatim, including the missing
  French space before the colon: `professeur:` → `professeur :` (still a typo, still pending).

`frontend/locales/fr/courses.json` (added by feature/i18n-06-courses lot 3 —
`AddSlotForCourse.jsx`, `DeleteCourseModal.jsx`):
- `deleteCourse.prompt` — "Souhaitez-vous:" → "Souhaitez-vous :" (missing French space before the
  colon; preserved verbatim from `DeleteCourseModal.jsx`, same treatment as the lot-2
  `professeur:` entry above).
- `deleteCourse.deleteAll` / `deleteCourse.deleteSelected` / `addSlot.editSeasonPeriodHint` /
  `addSlot.weeklyRecurrenceInfo` — extracted from multi-line JSX text (and, for `deleteAll`, a
  leading space after the `<label>` tag). Leading/among-word whitespace collapsed to single
  spaces during extraction; no visible change (HTML collapses it, and a `{" "}` already precedes
  the affected label). Same normalization note as the lot-2 `slotBusy` entry.

`frontend/locales/fr/courses.json` (added by feature/i18n-06-extract-courses-lot4 —
`LessonList.jsx`) — preserved verbatim from the component (the reference-date help popover was
assembled from 6 concatenated string literals):
- `lessonList.help.body` — `</u>. tous les cours` → `</u>. Tous les cours` (lowercase after the
  full stop)
- `lessonList.help.body` — `imaginons le cas suivant:` → `imaginons le cas suivant :` (missing
  French space before the colon)
- `lessonList.help.body` — `que les nombres la colonne "Occupation"` → `que les nombres de la
  colonne "Occupation"` (missing "de")
- `lessonList.help.body` — `l'occupation seras de 3` → `l'occupation sera de 3` ("seras" → "sera")

The literal `\n`, the `<br />` tags, the single-quote HTML attributes and the trailing space
before the final `</p>` inside `lessonList.help.body` are intentional source artifacts kept
verbatim — a blanket "trim / normalize the locale files" pass must not touch them. The English
side (`lessonList.help.body`) is a clean translation with these defects fixed, as expected.

`frontend/locales/fr/activities.json` (added by feature/i18n-06-extract-activities-lot2b —
`ActivityRefBasics.jsx`) — preserved verbatim from the component:
- `activityRefBasics.fields.spotsOverbooking` — "Places (avec surbooking)": "surbooking" is
  franglais → "surréservation" (or "overbooking"). Kept verbatim; the English side reads
  "Spots (with overbooking)".
- `activityRefBasics.fields.spotsOverbookingTooltip` — "vous pouvez ajouter des nouvelles places"
  → "…de nouvelles places" (partitive "de", not "des", before the preposed adjective "nouvelles").
  Kept verbatim.
- `activityRefBasics.pricing.sectionHint` — extracted from JSX text split across two lines; the
  inter-line whitespace was collapsed to a single space during extraction (no visible change —
  HTML collapses it). Same normalization note as the lot-3 `courses.json` entries.

`frontend/locales/fr/activities.json` (added by feature/i18n-06-extract-activities-lot2c —
`ActivityRefApplication.jsx`, `WorkGroupTemplateEditor.jsx`, `ActivityRefPricingModal.jsx`) —
preserved verbatim from the components:
- `activityRefApplication.visibility.isLesson` — "Ce cours peut être **selectionné** lors d'une
  inscription": "selectionné" → "sélectionné" (missing accent).
- `activityRefApplication.visibility.isVisibleToAdmin` — same "selectionné" → "sélectionné"
  (missing accent).
- `activityRefApplication.evaluation.title` — "Evaluation" → "Évaluation" (missing accent; this is
  the `<h3>` above the `is_evaluable` checkbox, distinct from the `activityRefKind` "type"
  wording). The English side reads "Evaluation" (correct as-is in English).
- `activityRefApplication.reenrollment.label` — extracted from `<label>` JSX text split across two
  lines; the inter-line whitespace was collapsed to a single space during extraction (no visible
  change — HTML collapses it). Same normalization note as the lot-2b `sectionHint` entry.

`ActivityRefBasics.jsx` also has two non-i18n issues noticed during the lot-2b review, left as-is:
- `fetchSeasonsAndPricings` runs from the **constructor**, so the `const { t } = this.props` its
  `.error` swal closure captures is frozen at mount time (won't follow a later `changeLanguage`).
  Materially benign — the request settles within ms of mount and a locale switch is a full server
  reload — but same class as the other frozen-at-construct translations logged in this file.
- `selectedSeasons` `Cell` (`ActivityRefBasics.jsx` ~line 158): `seasonEnd` is set to `null` in the
  else branch then tested with `seasonEnd !== undefined`, which `null` passes → an open-ended
  pricing row (no `to_season_id`) hits `null.label` and throws in the cell instead of rendering
  the intended `"<start> > ..."`. Pre-existing (byte-identical before the i18n extraction),
  needs its own fix — the test should be `to_season_id !== undefined` / `seasonEnd != null`.

`frontend/locales/fr/activityApplications.json` (added by feature/i18n-06-extract-activities-lot3a
— new `activityApplications` namespace; `Evaluation.jsx`, `TimePreferences.jsx`,
`AddPreAppFromStopApp.jsx`) — preserved verbatim from the components:
- `evaluation.answerQuestionnairesError` — "Veuillez répondre **au.x questionnaire.s**":
  `au.x questionnaire.s` → `au(x) questionnaire(s)` (sloppy dotted "au(x)/(s)" contraction in the
  source). Kept verbatim; the English side reads "Please answer the questionnaire(s)" (clean).
- `timePreferences.title` — "**Préferences** horaires des activités (hors **Eveil**)": two typos in
  one string — `Préferences` → `Préférences` (missing accent) and `Eveil` → `Éveil` (missing accent
  on the proper activity name). Both kept verbatim.
- `addPreApp.confirmHtml` — "…de se préinscrire **à l 'activité** pour la…": stray space in
  `à l 'activité` → `à l'activité`. Kept verbatim (sweetalert2 `title` rendered as HTML, so the
  literal `<h5>`/`<b>` tags are intentional).
- `addPreApp.openButton` — "Ouvrir la **PréInscription**": `PréInscription` → `préinscription`
  (odd internal capital, mid-sentence). Kept verbatim; the English side reads "Open
  pre-registration".

`frontend/locales/fr/activityApplications.json` (added by feature/i18n-06-extract-activities-lot3b
— `UserSearch.jsx`, `TimeIntervalPreferencesEditor.jsx`, `FormulaActivitiesModal.jsx`,
`summary/WorkGroupEditor.jsx`, `WizardUserSelectMember.jsx`) — preserved verbatim from the
components:
- `formulaActivitiesModal.selectedCount` — "Activités sélectionnées:" → "Activités sélectionnées :"
  (missing French space before the colon; a `<strong>` label followed by " N / M").
- `formulaActivitiesModal.selectAmong_one` / `selectAmong_other` — "…parmi les suivantes:" →
  "…parmi les suivantes :" (missing French space before the colon). Same defect in both plural
  forms.
- `workGroupEditor.cannotAddMultiple` — "Impossible d'ajouter plusieurs **rôle et option** à un
  seul élève" → "…plusieurs **rôles et options**…" (plural agreement after "plusieurs"). Used 4×
  in the component; one key. English side reads correctly ("multiple roles and options").
- `workGroupEditor.close` — source literal is the English word "Close" (an `aria-label`); fr should
  be "Fermer" (`Close` → `Fermer`). Kept verbatim; the English side is "Close" (correct as-is).
- `workGroupEditor.addRole` — "Ajouter rôle" (no article), inconsistent with "Ajouter un membre" /
  "Ajouter un contact" elsewhere in the same namespace; should be "Ajouter un rôle". Kept verbatim.
- `wizardUserSelectMember.selectMember` — "**Veuilez** sélectionner un membre" → "**Veuillez**
  sélectionner un membre" (typo). Kept verbatim; the English side reads "Please select a member".
- `wizardUserSelectMember.ifMinorAddMember` — "Si la personne est **mineur**, ajouter un nouveau
  membre" → "…est **mineure**…" ("la personne" is feminine). Masculine agreement for a person of
  unknown gender; kept verbatim. English side: "If the person is a minor…".

Also re-scan the whole `frontend/locales/fr/` + `config/locales/fr.yml` when doing this (grep for
`Edition\b`, `Editer\b`, `Selectionn`, `réglement`, `Echéance`, `Echec`, `Emmeteur`, `Precedent`,
`Creer\b`, `verouiller`, `Resolution\b`, `complêtement`, `remplis\b`); the list above is only what
was noticed in passing, not an exhaustive audit. The English side of these keys is already spelled
correctly.

Non-typo notes from the lot-3b review (behaviour / consistency, not blocking):
- **`const T` helper is non-reactive.** `UserSearch.jsx` and `WizardUserSelectMember.jsx` are
  StepZilla steps (can't be `withTranslation`-wrapped), so their strings go through a module-level
  `const T = (k, o) => i18n.t(\`activityApplications:${k}\`, o)`. `T` re-reads the singleton per
  call (not frozen), but the components don't subscribe to `languageChanged`, so they don't
  re-render on an in-page `i18n.changeLanguage()`. In `UserSearch` the one `<Trans>` line
  ("Sinon …") *does* subscribe, so a live locale switch would render that line in the new language
  while the surrounding `T(...)` sentences stay in the old one — a mixed-language panel. Same
  non-reactivity in `TimeIntervalPreferencesEditor.jsx`'s nested `Availability` class (calls
  `i18n.t` directly). Harmless while a locale switch is a full server reload; same class as the
  other frozen-translation entries in this file. Fix (if ever): thread `t` in from `Wizard` once
  that's translated, or split the `<Trans>` into `T(...)` fragments.
- **Plural keys have no non-plural fallback.** `formulaActivitiesModal.{maxSelectable,
  selectToValidate,selectAmong}` are `_one`/`_other` only. `t(key, {count: undefined})` renders the
  raw key string to the user (verified). Not reachable now — `Formule` validates
  `number_of_items` present + `>= 1` and the serializer emits it as an Integer — but if a future
  `as_json only:` list drops the attribute, the old hand-rolled code degraded to
  "Sélectionnez  activité …" whereas the new code prints a translation key. Keep `number_of_items`
  in that serializer's output.
- For future `<Trans>` keys: react-i18next 17's default `transKeepBasicHtmlNodesFor` is
  `["br","strong","i","p"]` — `em`/`a` are NOT in it. Use the **indexed** form (`<1>…</1>`), which
  maps by child position regardless of the keep-list; a literal `<em>`/`<a>` in a key value gets
  escaped instead of kept.

`frontend/locales/fr/activityApplications.json` (added by feature/i18n-06-extract-activities-lot3c
— `FormulaChoice.jsx`, `ActivityChoice.jsx`, the two enrolment-wizard "choose your package /
choose your activities" panels) — preserved verbatim from the components:
- `formulaChoice.estimatedTotal` — "Total estimé:" → "Total estimé :" (missing French space before
  the colon; rendered as `{estimatedTotal} {price} €`).
- `activityChoice.estimatedTotal` — "Total estimé" (no colon). The source JSX had "Total\n estimé"
  split across two lines; the inter-line whitespace was collapsed to a single space during
  extraction (no visible change — HTML collapses it). Note the sibling
  `formulaChoice.estimatedTotal` for the same concept carries a trailing colon and this one does
  not — kept as-is.
- `activityChoice.noActivitySelected` — "aucune activité sélectionnée" (lowercase leading "a"),
  inconsistent with `formulaChoice.noActivitiesSelected` = "Aucune activité sélectionnée"
  (capitalised) for the same concept; both are standalone `<td>` cell contents, so the lowercase
  is just a defect, not a mid-sentence context. Kept verbatim; the English side reads "No activity
  selected" (capitalised, correct).
- `activityChoice.unpopularWarning` — "…soumises à un nombre minimum d'élèves par cours:" →
  "…par cours :" (missing French space before the colon). Was JSX text across two lines,
  whitespace collapsed during extraction. Kept verbatim; the English side is clean.

Dedup opportunity (not a defect): `formulaChoice.*` and `activityChoice.*` each redeclare
`summary` = "Récapitulatif", `duration`/`colDuration` = "Durée", `colEstimatedPrice` = "Tarif
estimé", `searchPlaceholder` = "Rechercher"; these also duplicate `selectedActivitiesTable.*` and
`formulaActivitiesModal.col*` from lots 3a/3b — and `activityChoice.title` ("Choix de l'activité"
/ "Activity choice") is EN-identical to lot-3b's `formulaActivitiesModal.activityChoice` ("Choix
des activités" / "Activity choice"). Kept per-component for now (consistent with the earlier
sub-lots). A shared `activityApplications` sub-block is a later cleanup — do not restructure ad hoc.

Untranslated unit tokens in the two lot-3c files (same class as the `SelectedActivitiesTable` /
`FormulaActivitiesModal` entry below — the `<th>`s are translated, the value formatters are not):
`ActivityChoice.jsx:25,27` (`` `${hours}h${minutes}` `` / `` `${ref.duration} min` ``),
`FormulaChoice.jsx:181` (`{duration !== "--" ? "min" : ""}`), and `"--"` placeholders at
`ActivityChoice.jsx:15,17,21,297,449` / `FormulaChoice.jsx:96,131,171`.

`frontend/locales/fr/activityApplications.json` (added by feature/i18n-06-extract-activities-lot3d
— `Wizard.jsx`, the StepZilla orchestrator of the enrolment flow) — preserved verbatim from the
component:
- `wizard.seasonsClosed` — "Les inscriptions à la saison actuelle **est fermée** et celles de la
  saison suivante ne sont pas encore ouvertes." → "…**sont fermées**…" (number agreement: the
  subject "Les inscriptions" is plural). Was JSX text across two lines, inter-line whitespace
  collapsed to a single space during extraction. Kept verbatim; the English side is a clean,
  grammatically correct translation.
- `wizard.newApplicationTitle` — "Nouvelle demande **d’inscription**" uses a **typographic
  apostrophe** `’` (U+2019), unlike every other value in this file, which uses the straight `'`
  (`d'inscription`, `à l'activité`, `l'accueil`, …). Preserved verbatim; flagged as an
  apostrophe-style inconsistency for the eventual cleanup pass (do not let a blanket
  quote-normalisation silently "fix" only this one).
- `wizard.steps.member` — "Membre **C**oncerné" has a mid-phrase capital "C" → "Membre concerné"
  (cf. `wizardUserSelectMember.memberConcerned` = "Membre concerné", the correct form, in the same
  file). Kept verbatim; the English side reads "Member concerned".
- `wizard.steps.changeWishes` — "**Voeux** de changement" → "**Vœux** de changement" (missing the
  œ ligature). Kept verbatim; the English side reads "Change requests".

Intentional artifacts in the lot-3d block — a blanket "trim / normalize the locale files" pass
must not touch these:
- `wizard.applicationSubtitle.allActivities` (" aux activités" — leading space) and
  `wizard.applicationSubtitle.oneActivity` (" à l'activité {{activity}} " — leading **and**
  trailing space) are sub-lexical fragments concatenated into `applicationSubtitle.full` at render
  time; the surrounding spaces are load-bearing glue. Same treatment on the English side
  (" for all activities" / " for the activity {{activity}} ").
- `wizard.submit.applicationRegisteredHtml` was assembled from 6 concatenated JS string literals
  with no separator; the literal `<p>`/`<b>`/`<br/>` tags are intentional (rendered as HTML by
  sweetalert2). The French text has no typo of its own; the English side is a clean translation.
  Same class as the lot-4 `courses.json` `lessonList.help.body` entry.

Not a defect (keep note): `wizard.nextStep` = "Suivant" and `wizard.prevStep` = "Précédent" are
byte-identical to `common:reactTable.nextText` / a matching back label, but they are StepZilla
next/back button labels in a different context and are kept local to the `wizard` block, per the
lot brief.

## `activityApplications` — residual French from lot-3a's not-yet-processed siblings

The i18n-06 activities lot-3a review surfaced hardcoded French in files that lot 3a did NOT touch
but that sit right next to (or override) the keys it added. Deferred to the later 3.x sub-lots;
listed here so the flow isn't half-localised in the meantime and nothing gets missed:

- `frontend/components/activityApplications/summary/Summary.jsx:1431` — passes
  `noIntervalMessage="Pas de créneau"` into `EvaluationChoiceTable`, which **overrides** the new
  `activityApplications:evaluationChoice.noIntervalMessage` key at the only call site that supplies
  the prop → that modal still shows French in English mode. Also `Summary.jsx:1428`
  `tooltip="Créneau d'évaluation"`. → lot 3g.
- `frontend/components/activityApplications/Validation.jsx:287, 291, 403, 407, 427` — hardcoded
  French `<h3>` section headings. → lot 3e.
- `frontend/components/activityApplications/SelectedActivitiesTable.jsx:10-12` — `displayDuration`
  emits `"5h30"` / `"45min"` with untranslated unit tokens (the `<th>`s themselves ARE translated
  as of lot 3a). Low priority; arguably acceptable in EN. → whenever `SelectedActivitiesTable` is
  revisited. **Same untranslated `"min"` / `"--"` tokens in
  `FormulaActivitiesModal.jsx:~228,~250`** (lot 3b — `<th>`s translated, unit token left).
- `frontend/components/activityApplications/EvaluationChoiceTable.jsx` — pre-existing (not i18n):
  its `data[].timeInterval.start/end` are passed straight to `toHourMin()` (`.getHours()`), so they
  must be `Date` objects, not ISO strings — unlike the sibling `TimePreferencesTable` which wraps
  with `toDate()`. An ISO string silently renders `NaN:NaN`. Fix when that file is next touched.
- Behaviour note (not a bug): lot 3a replaced `noIntervalMessage = DEFAULT` (fires on `undefined`
  only) with `noIntervalMessage ?? t(...)` (fires on `undefined` AND `null`) in `EvaluationChoice`
  / `EvaluationChoiceTable`. No call site passes `null`; `""` is unchanged. Flagged only so a
  future caller passing `null` to mean "render nothing" isn't a surprise.

## `components/utils/ui/tabs.jsx` — hardcoded French tab-error tooltip (+ 2 typos)

`frontend/components/utils/ui/tabs.jsx:41` sets `title: "Cet onglet n'est pas complêtement remplis"`
on any tab whose `isInError` is true. Surfaced during i18n-06 `activities` lot 2a:
`ActivityRefContainer` passes `isInError` for the "Activité"/"Professeurs" tabs, so in English mode
the header renders "Activity" but its hover tooltip is French. `tabs.jsx` is a shared UI util —
extract it whenever the `parameters` domain (or whichever lot owns `components/utils/`) is done,
not piecemeal from `activities`. Typos to fix on the way: `complêtement` → `complètement`,
`remplis` → `rempli` (subject is "onglet", singular).

## `activityRef/ActivityRefContainer.jsx` — `this.teachersError` is a one-way side-channel

`onValidate` sets `this.teachersError` (instance field, not form state) when `values.teachers` is
empty and never clears it; `render` reads it as `isInError: !!this.teachersError`. Once tripped,
the Teachers tab keeps its error icon + tooltip for the component's life even after a teacher is
selected, and the icon lags one render (instance mutation inside final-form `validate`, read in
`render`). Pre-existing — i18n-06 lot 2a only swapped the literal `"doit être renseigné"` for
`t(...)`, behaviour unchanged. Noted here so it isn't mistaken for extraction damage.

## `courses/LessonList.jsx` — residual French after the lot-4 i18n extraction

The lot-4 extraction (`feature/i18n-06-extract-courses-lot4`) translated every string the component
*owns*, but three things still render French in English mode and are deliberately out of that
lot's scope:

- **Level column / row-expander level cell** — `displayLevel()` compares `studentLevel` and
  `TimeIntervalHelpers.levelDisplayForActivity(...)` against the French sentinel literals
  `"NON INDIQUÉ"` and `"À PRÉCISER"`. Lot 4 maps *both* sentinels to the translated
  `lessonList.userRow.notSpecified`, but the comparisons themselves still hard-code the French
  strings, which live in `frontend/components/planning/TimeIntervalHelpers.jsx:264,270,271`
  (not yet extracted). **When the planning lot i18ns `TimeIntervalHelpers`, these `===` /
  `!==` checks in `LessonList.jsx` (~lines 1384, 1401-1403) break silently** — `displayLevel()`
  will fall through to the raw helper output. Extract helper + call-site comparisons together.
  Any *real* level label the helper returns (e.g. a season-defined "Débutant") is data, not
  chrome, and is left as-is.
- **Day column** — the `Jour` header is translated but the `Cell` (`moment(start).format("dddd")`)
  and the day-filter `<option>`s (`day.format("dddd")`) stay `lundi`/`mardi` because the component
  calls `moment.locale("fr")` at module scope *and* on every `render()` (`LessonList.jsx:13, 594`).
  That call also clobbers the process-wide moment locale that `frontend/i18n/index.js` maintains,
  so any component rendered after `LessonList` on the same page gets French dates too. Pre-existing,
  not introduced by lot 4.
- **Started/Stopped dates** in the row expander use `Intl.DateTimeFormat("fr")`
  (`LessonList.jsx` ~1418, 1423) — always `DD/MM/YYYY`, ambiguous for en-US users.

Also: `message.title` defaults to `i18n.t("courses:lessonList.messageDefaultTitle")` evaluated in
the **constructor**, so it's frozen at construct time and won't follow a later `changeLanguage`
(harmless — a locale switch is a full server reload; same class of issue as the
generalPayments/`planning/Calendar.jsx` frozen-header notes above). The 12 react-table column
headers are fine — they're rebuilt inside `render()`.

## `frontend/tools/constants.js` — hardcoded French `WEEKDAYS` / `MONTHS` / `MESSAGES` leak into English mode

Surfaced during the i18n-06 `courses` lot 1 extraction (`AddCourse.jsx`, `AddCourseSummary.jsx`,
`AddActivityForCourse.jsx`). These modules were switched to `t()` for their own copy, but they
still read three shared French-only constants that were left as-is:

- `WEEKDAYS` / `MONTHS` (`tools/constants.js`) — French day/month name arrays. `AddCourseSummary.jsx`
  builds its slot line from them, so in English the recap reads e.g.
  `Lundi 16 Juin 2025 from 08h00 to 09h00`.
- `MESSAGES.err_data_missing` ("Impossible de continuer, des données obligatoires sont manquantes.")
  — toasted from `AddCourse.jsx`.
- `MESSAGES.err_must_choose_activity` ("Veuillez choisir une activité avant de continuer.") —
  toasted from `AddActivityForCourse.jsx#isValidated`.
- `MESSAGES.err_must_select_user` ("Veuillez sélectionner un utilisateur avant de continuer.") —
  toasted from `activityApplications/UserSearch.jsx#isValidated` (i18n-06 activities lot 3b).

`tools/constants.js` is imported from many components across the app, so this is a cross-cutting
pass in its own right (a `common:` namespace + a `useTranslation`/prop for the class consumers),
not something to fix piecemeal inside one domain lot. Left verbatim for now; logged here so a
later "constants i18n" lot picks them all up together. Grep: `from "../../tools/constants"`.
