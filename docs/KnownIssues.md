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
- `views.users.show.edit_link` — `"Éditer"` / `"Edit"` (i18n-05) — the missing-accent value
  (`"Editer"`) was fixed in `feature/i18n-typo-cleanup`, so all three now agree on copy.

`common.actions.edit` is still the intended canonical key: the two `views.users.*` keys should be
pointed at it and dropped in a cleanup pass — **not done** (retrofitting the users views is a
structural change, out of the typo pass's scope). Same applies to any other verbatim action-label
duplication that predates `common.actions.*` (check `common.actions` against the `views.*` trees
when doing the pass).

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

## i18n PRs #7–#10 never got a specialized code-review pass

The first few i18n extraction PRs (#7 `extract-users`, #8 `extract-evaluation`, #9
`extract-payments`, #10 `common-react-table-keys`) were reviewed inline only (diff read + test
suites + key-parity check), before the process changed to route every i18n PR through the
specialized `code-reviewer` agent (from PR #11 onward, followed ever since). Backfilling a
specialized pass on these four is still open but low priority — every one of them has since been
re-touched, tested, and reviewed by several later lots, so a fresh full-codebase review is more
useful than re-reviewing an isolated 2026-08 diff in isolation.

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

Same pattern again (added by i18n-06 `parameters` lot A): the settings-area chrome resolves its
strings once and never re-derives on `languageChanged` —
- `parameters/BaseDataTable.jsx` reads the bare `i18n` singleton (`i18n.t("common:actions.create")`
  + the 7 `common:reactTable.*` props) — it can't be `withTranslation`-wrapped because ~15 CRUD
  tables `extends BaseDataTable`.
- The 5 class tab-wrappers (`Community`/`Rooms`/`Evaluations`/`Payments`/`Practice` `*Parameters.jsx`)
  build `this.state.tabsNames` from `props.t(...)` in the **constructor**; `BaseParameters.render()`
  reads `this.state.tabsNames`.
Harmless for the same full-reload reason. Fix alongside the rest of this section.

Same pattern again (added by i18n-06 `parameters` lot B): the 7 `parameters/Practice/*.jsx` CRUD
tables (`BandsType`/`Features`/`FlatRate`/`Groups`/`Instruments`/`Materials`/`MusicGenres`) build
`this.state.columns` with the constructor's `t` (`Header: t("practice.cols.*")`), and their boolean
`Cell` closures capture that same construct-time `t` for the `t("practice.yes"/"no")` render.
Extra wrinkle unique to lot B: `deleteStatus()` reads `this.props.t` (live), so an in-page
`changeLanguage` would give a **mixed-language** table — frozen French column headers next to an
English delete-confirm dialog. Still harmless today (full-reload locale switch), logged for the
same cleanup pass.

Same pattern again (added by i18n-06 `parameters` lot C): `parameters/Payments/PaymentsMethods.jsx`
and `parameters/Payments/PaymentsStatus.jsx` — two more `extends BaseDataTable` tables that build
`this.state.columns` with the constructor's `t` and capture it in their boolean `Cell` closures,
with the same live-`this.props.t`-in-`deleteStatus` mixed-language wrinkle as lot B.

Same pattern again (added by i18n-06 `parameters` lot E):
- `parameters/Evaluations/EvaluationLevels.jsx` (`extends BaseDataTable`) and
  `parameters/Rooms/Localisations.jsx` (`extends React.Component`, own `<ReactTable>`) build
  `this.state.columns` with the constructor's `t` and capture it in the boolean `Cell` closures;
  both also read a live `this.props.t` in `deleteStatus` — same mixed-language wrinkle.
- **New variant:** `Localisations.jsx` `render()` reads live `this.props.t` for the 7
  `common:reactTable.*` pagination props while `state.columns` stays frozen from the constructor.
  So an in-page `changeLanguage` on that table would show three states at once — frozen French
  column headers, live-translated pagination chrome, live-translated delete dialog. First lot with
  a live `render()` reader sitting next to frozen `state.columns`.
- Mount-time `t` captured in api callbacks (same class as the lot-D entry further down): the
  `useTranslation` `t` closed over by the mount `useEffect` `.error` handlers in
  `Plannings/SchoolAvailabilities.jsx`, `Plannings/CancelActivityParameters.jsx`,
  `Plannings/PlanningDisplayParameters.jsx`, and `Localization/LocalizationParameters.jsx`.
All harmless today (locale switch = full server reload); logged for the same cleanup pass.

`parameters/Evaluations/EvaluationSlot.jsx` — the `evaluations.slot.requiredError` key
("Le créneau est requis" / "The slot is required") is **unreachable copy**: it is gated on
`errors.name` while the field is registered as `sessionHour` (`register('sessionHour', …)`), so
the react-hook-form error object never has a `name` entry and the message never renders.
Pre-existing (identical `{errors.name && "Le créneau est requis"}` at the pre-lot-E revision);
lot E only swapped the literal for `t(…)`. Fix is `errors.sessionHour` — do it in the cleanup
pass, not mid-extraction. Covered by an inline comment in `PlanningsSettings.test.jsx`.

## Locale-file verbatim typos — RESOLVED

**STATUS: DONE.** The full extraction-era catalogue of preserved-verbatim French defects across
`frontend/locales/fr/*.json` and `config/locales/fr.yml` — missing accents, colon-spacing,
number/gender agreement, anglicisms, casing, the informal `.e`/`·e` inclusive-gender contractions,
apostrophe style, the œ ligature, and the `MailSettings`/`RulesSettings`/`DragAndDrop` casing
defects — was corrected across `feature/i18n-typo-cleanup` (PR #51) and
`feature/i18n-parameters-shared-consolidation` (PR #52). Verified 2026-09-04 by reading every
flagged key back out of the current locale files: all of it landed. fr/en parity and
`bin/i18n-tasks health` are clean. The three stragglers this section used to list —
`evaluations.levels.deleteConfirm` (wrong noun), `evaluations.levels.colCanContinue`, and
`plannings.schoolAvailabilities.hint` — were fixed in `fix/known-issues-easy-batch`.

**Load-bearing whitespace — do not let a future normalize/trim pass touch these.** Each carries a
leading and/or trailing space that is concatenation glue at its call site, or wraps intentional
inline HTML:
- `planning:activityModal.createCoursesButton` / `createCourseButton` (trailing space before the
  next inline element) and `activityModal.teacherChangeWarningLabel` (trailing space, `<b>` prefix).
- `common:messages.errIsInvalidId` (trailing space before the `<button>` rendered right after it
  in `UserForm.jsx`'s redirect toast).
- `activityApplications:summary.reasonForRefusal` / `summary.memberNumber` (leading/trailing space,
  concatenated next to a value at the call site).
- `activityApplications:wizard.applicationSubtitle.{allActivities,oneActivity}` — leading-space-only
  fragments concatenated into `applicationSubtitle.full`; adding a trailing space would double the
  gap in the rendered `<h3>`.
- `courses:lessonList.help.body`, `activityApplications:wizard.submit.applicationRegisteredHtml`,
  `activityApplications:addPreApp.confirmHtml` — literal `<br/>`/`<p>`/`<b>`/`<h5>` HTML rendered by
  sweetalert2 or `dangerouslySetInnerHTML`; the tags are intentional, not markup that leaked in.
- `parameters:editParameters.school.activitiesNotVatLabel` is a `<Trans>` key using the indexed
  `<1>…</1>` form (`u` is not in react-i18next's default `transKeepBasicHtmlNodesFor`) — `<1>` must
  stay `<1>` in both locales.

**Non-typo behaviour notes still relevant:**
- The `const T = (k, o) => i18n.t(...)` helper used by StepZilla steps (`UserSearch.jsx`,
  `WizardUserSelectMember.jsx`, and `TimeIntervalPreferencesEditor.jsx`'s nested `Availability`
  class) re-reads the singleton per call but doesn't subscribe to `languageChanged`, so these
  components don't re-render on an in-page `i18n.changeLanguage()`. `UserSearch`'s one `<Trans>`
  line *does* subscribe, so a live switch would briefly show one line in the new language while the
  rest stays in the old one. Harmless while the locale switch is a full server reload — same class
  as the frozen-at-construct section above.
- Plural keys with no non-plural fallback: `activityApplications:formulaActivitiesModal.{maxSelectable,
  selectToValidate, selectAmong}` are `_one`/`_other` only — `t(key, {count: undefined})` renders
  the raw key string. Not currently reachable (`Formule#number_of_items` is always present), but
  keep that attribute in any future serializer `as_json only:` list.
- The level sentinel `activityApplications:summaryActivity.notSpecified` mirrors the **raw** French
  string a `===` comparison checks elsewhere (`LevelCell`) — correct as-is; don't translate the
  comparison literal itself in a future refactor.
- For any new `<Trans>` key: react-i18next's default `transKeepBasicHtmlNodesFor` is
  `["br","strong","i","p"]` — `em`/`a`/`u` are not in it. Use the indexed `<1>…</1>` form.

Remaining non-i18n code bugs surfaced while extracting these files (none are locale-file defects).
The `ActivityRefBasics.jsx` `seasonEnd` guard listed here previously (`seasonEnd !== undefined`
crashing on `null.label`) was fixed in `fix/known-issues-easy-batch`, along with the byte-identical
copy in `formules/EditFormule.jsx:342-343` — no known call site produces the `to_season_id`-key-
absent shape that actually crashes (every producer sends `to_season_id: null` for an open-ended
row, which never crashed), so both were defensive hardening rather than a live-bug fix; still
worth keeping as a guard against a future caller building the row by hand. The same `Cell` in both
files still has the identical unguarded shape one line up — `seasonStart.label` throws if
`from_season_id` doesn't match any fetched season — low reachability (`get_seasons_and_pricing_categories`
returns every season) but the asymmetry is now visible since the `seasonEnd` half was hardened.
- `activityApplications/summary/Summary.jsx:~1322` reads `e.activity.activity_reéf_id` (stray
  accented `é`) where it means `activity_ref_id` — a silent lookup failure in the `courseOption`
  label, not a crash.
- `parameters/Practice/Materials.jsx` "Est Actif ?" column: `accessor: d => d.name` should be
  `d => d.active` — the `Cell` renders the right value from `props.original.active`, but
  sorting/filtering that column operates on the name field instead.
- `parameters/Payments/AdhesionSettings.jsx` second `useEffect`'s error branch uses
  `icon: 'error'`; every other swal in the file uses `type: 'error'`. sweetalert2 is pinned at
  `^7.26.11` (`icon:` only exists from v9), so that one dialog renders without its error styling.
- `parameters/Payments/AdhesionSettings.jsx`'s inline `<ReactTable>` (not routed through
  `BaseDataTable`) passes none of the `common:reactTable.*` pagination props, so react-table's
  English defaults ("No rows found", "Page", "of", "rows") render inside the French UI.
- `parameters/Payments/AdhesionSettings.jsx` / `AdhesionEditModal.jsx`: `initialValues.label`
  defaults to the translated string `t("payments.adhesion.modal.defaultLabel")`. If an EN-locale
  admin leaves the field untouched, that literal English string gets POSTed and persisted as data —
  a UI-string-as-data smell that should be an explicit server-side default, not a client i18n key.
- `parameters/Evaluations/EvaluationSlot.jsx`: the required-field error `{errors.name &&
  t("evaluations.slot.requiredError")}` guards on `errors.name`, but the field is registered as
  `register('sessionHour', ...)` — the message can never render. Fix: `errors.sessionHour`.
- `editParameters/SchoolParameters.jsx`: `register("email", {required: true, pattern:
  validateEmail})` passes a function where react-hook-form's `pattern:` needs a RegExp
  (`tools/format.jsx`'s `validateEmail` is a matcher, not a RegExp) — RHF's `instanceof RegExp`
  guard silently drops the rule, so `required` still fires but the format check is a no-op.
- `frontend/tools/format.jsx` `toFullDateFr` month off-by-one — see its own section below.
- `courses/LessonList.jsx` calls `moment.locale("fr")` at module scope *and* on every `render()`
  (`:15, :594`), which also clobbers the process-wide moment locale `frontend/i18n/index.js`
  maintains — any component rendered after `LessonList` on the same page gets French dates
  regardless of the active UI language.

Reference — dedup opportunities intentionally not touched (each pair is a distinct source literal
under the verbatim policy, not a bug): `activityChoice.*`/`formulaChoice.*`/
`selectedActivitiesTable.*`/`validation.col*` in `activityApplications.json` all redeclare the same
"Récapitulatif"/"Durée"/"Tarif estimé"/"Rechercher" concepts per-component; the "no activity
selected" concept has three near-duplicate keys across `activityChoice`/`formulaChoice`/
`validation`. A shared `activityApplications` sub-block would fold these — not attempted here to
avoid restructuring ad hoc across an already-merged domain.

## `activityApplications` — small untranslated unit tokens

Surfaced during the i18n-06 activities lot-3a review; the `noIntervalMessage`/`tooltip` override
and the `Validation.jsx` `<h3>` headings this section used to flag are now translated (lots 3e/3g).
What's left, low priority:

- `SelectedActivitiesTable.jsx:10-12`'s `displayDuration` emits `"5h30"` / `"45min"` with
  untranslated unit tokens (the `<th>`s themselves are translated). Same untranslated `"min"` /
  `"--"` tokens in `FormulaActivitiesModal.jsx:~228,~250`.
- `EvaluationChoiceTable.jsx` — pre-existing (not i18n): verify `data[].timeInterval.start/end`
  reach `toHourMin()` as `Date` objects, not ISO strings, the way the sibling
  `TimePreferencesTable` wraps them with `toDate()` — an ISO string would silently render
  `NaN:NaN`.

## `components/utils/ui/tabs.jsx` — hardcoded French tab-error tooltip (+ 2 typos)

`frontend/components/utils/ui/tabs.jsx:~44` sets `title: "Cet onglet n'est pas complètement rempli"`
on any tab whose `isInError` is true. Surfaced during i18n-06 `activities` lot 2a:
`ActivityRefContainer` passes `isInError` for the "Activité"/"Professeurs" tabs, so in English mode
the header renders "Activity" but its hover tooltip is still **French** — the string is a component
literal, not a locale key. The two typos (`complêtement` → `complètement`, `remplis` → `rempli`)
were fixed in-place in `feature/i18n-typo-cleanup`; the string itself is still not i18n'd. `tabs.jsx`
is a shared UI util — extract it whenever a lot owns `components/utils/` (a `common:` namespace +
a `t` prop, since it's a fn component with no `useTranslation`), not piecemeal from `activities`.

## `activityRef/ActivityRefContainer.jsx` — `this.teachersError` is a one-way side-channel

`onValidate` sets `this.teachersError` (instance field, not form state) when `values.teachers` is
empty and never clears it; `render` reads it as `isInError: !!this.teachersError`. Once tripped,
the Teachers tab keeps its error icon + tooltip for the component's life even after a teacher is
selected, and the icon lags one render (instance mutation inside final-form `validate`, read in
`render`). Pre-existing — i18n-06 lot 2a only swapped the literal `"doit être renseigné"` for
`t(...)`, behaviour unchanged. Noted here so it isn't mistaken for extraction damage.

## `courses/LessonList.jsx` — residual French after the lot-4 i18n extraction

The lot-4 extraction (`feature/i18n-06-extract-courses-lot4`) translated every string the component
*owns*. One item flagged at the time is now resolved; two are deliberately still out of scope:

- ~~**Level column / row-expander level cell**~~ **Resolved by planning lot 3c**: the
  `=== "NON INDIQUÉ"` / `"À PRÉCISER"` comparisons in `displayLevel()` now use the exported
  `TimeIntervalHelpers.LEVEL_NOT_INDICATED` / `LEVEL_TO_SPECIFY` constants (see the
  `TimeIntervalHelpers.jsx` design note below), so they no longer depend on the raw French
  literals living in that file.
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

## `frontend/tools/constants.js` — hardcoded French constants leak into English mode — RESOLVED

Surfaced during the i18n-06 `courses` lot 1 extraction (`AddCourse.jsx`, `AddCourseSummary.jsx`,
`AddActivityForCourse.jsx`). These modules were switched to `t()` for their own copy, but they
still read shared French-only constants that were left as-is. `tools/constants.js` is imported
from many components across the app, so this was a cross-cutting pass in its own right, done as
constants-i18n lots 1–3, not piecemeal inside one domain lot:

- ~~`WEEKDAYS` / `MONTHS`~~ **Resolved — constants-i18n lot 1** (`feature/i18n-constants-lot1-dates`):
  moved to `common:weekdays` / `common:months`, re-exported as `export let` live bindings that
  follow `i18n.changeLanguage`. Two consumers with no i18n subscription of their own
  (`activityApplications/ItemPreferences.jsx`, `availability/AvailabilityList.jsx`) won't repaint
  on an in-page switch — harmless today (full-reload locale switch), same class as the
  frozen-header notes above.
- ~~`MESSAGES` / `API_ERRORS_MESSAGES`~~ **Resolved — constants-i18n lot 2**
  (`feature/i18n-constants-lot2-messages`): moved to `common:messages` / `common:apiErrors` (37 /
  9 entries), same `export let` live-binding + `languageChanged` re-read pattern as lot 1. Keys
  stay the original snake_case identifiers on both objects — several call sites index `MESSAGES`
  with a bare sentinel string a validator returned (`tools/validators.js`), not with UI text, and
  `tools/api.js` indexes `API_ERRORS_MESSAGES` with a server-supplied error code — only the
  *values* changed. 4 dead `MESSAGES` imports removed in the same pass
  (`DetachAccount.jsx`, `ActivityRefTeachers.jsx`, `ReplicateAct.jsx`, `InputSelectReact.jsx`).
- ~~`KINDS_LABEL` / `PRE_APPLICATION_ACTION_LABELS` / `RECURRENCE_TYPES`~~ **Resolved —
  constants-i18n lot 3** (`feature/i18n-constants-lot3-labels`), closing out the constants-i18n
  pass: `KINDS_LABEL` (4 entries, keyed by `INTERVAL_KINDS` codes) and
  `PRE_APPLICATION_ACTION_LABELS` (6 entries, keyed by action strings) moved to
  `common:kindsLabel` / `common:preApplicationActionLabels`, same `export let` pattern as lots 1–2.
  `RECURRENCE_TYPES` needed a different shape: it's an enum object with a `toString(type)` method,
  not a plain value dictionary, so only the object literal *inside* `toString` moved to
  `common:recurrenceTypes` (6 entries) — no `export let`/`languageChanged` needed there, since
  `toString` is a method and already reads `i18n.t()` fresh on every call. Two consumers with no
  i18n subscription of their own — `common/KindLegend.jsx` (plain function component) and
  `availability/AvailabilityInput.jsx` (bare `React.PureComponent`) — won't repaint on an in-page
  `changeLanguage` unless a subscribed ancestor happens to re-render; same class as the lot-1
  `ItemPreferences.jsx`/`AvailabilityList.jsx` note, harmless today (full-reload locale switch).

Grep: `from "../../tools/constants"`.

Dedup note (not a defect): `common:kindsLabel` now duplicates `planning:kinds` in both locales
(Cours/Course, Option, Évaluation/Evaluation all appear in both namespaces with agreeing values).
Fold into the existing cross-namespace consolidation backlog rather than acting on it now.

Two bugs found while extracting `MESSAGES` (preserved verbatim in the new locale keys per the
extraction policy, not fixed here):
- **`err_ord_lte` / `err_ord_lt` are swapped relative to their names.** `err_ord_lte` ("less than
  or equal", by its name) actually says "…doit être inférieure à…" (strictly less than, no
  "or equal"); `err_ord_lt` ("less than") says "…inférieure ou égale à…" (less than **or equal**).
  `validators.js`'s `ordCheck` calls each by name (`case "lt": ... err_ord_lt`, `case "lte": ...
  err_ord_lte`), so a real validation failure shows the **wrong** boundary wording — e.g. an
  `ordCheck(10, "lt")` failure says "…must be less than or equal to 10" when the rule actually
  requires strictly less than 10. Reachable wherever `ordCheck(..., "lt")` or `ordCheck(...,
  "lte")` is used. Fix: swap the two message bodies (or the two key names) to match.
- **`err_starts_with` / `startsWith` validator is dead and buggy.** `MESSAGES.err_starts_with`
  never uses its own `str` parameter (always renders the same generic text — preserved as-is,
  same class as the `noIntervalMessage` type of no-op default). Its only caller, `validators.js`'s
  exported `startsWith`, passes `length` instead of its own `str` param
  (`MESSAGES["err_starts_with"](length)`) — in a browser this resolves to `window.length` (`0`,
  the frame count), not a `ReferenceError`, so the failure branch silently returns the generic
  no-op text with the wrong argument rather than throwing. It **would** throw where there is no
  global `window` — e.g. reached from `packs/server_rendering.js`. No import of `startsWith` from
  `tools/validators.js` was found anywhere in `frontend/`, so it is dead code today; noted here
  rather than fixed, since fixing dead code risks masking that it's unreachable.

Adjacent bug found by the constants-i18n lot 2 review, pre-existing and untouched by this lot
(same class as the two above, more severe, not yet fixed): `userForm/ContactForm.jsx:202` and
`userForm/WizardContactForm.jsx:178` both render `{MESSAGES[meta.error]}` without ever importing
`MESSAGES` — neither file declares it locally either. A real `ReferenceError` crashes the render
of the family-link `<select>`'s error message on any validation failure there, in both languages.
Fix: add `import { MESSAGES } from "../../tools/constants";` to both files.

## `frontend/tools/format.jsx` — `toFullDateFr` renders the month off by one

Pre-existing (not i18n), spotted during constants-i18n lot 1 review. `toMonthName`
(`format.jsx:37`) is 1-based (`date.setMonth(parseInt(month, 10) - 1)`), but `toFullDateFr`
(`format.jsx:87`) feeds it a 0-based `getMonth()`:

```js
`${WEEKDAYS[tmpDate.getDay()]} ${tmpDate.getDate()} ${toMonthName(tmpDate.getMonth())} ${tmpDate.getFullYear()}`
```

So `toFullDateFr(new Date(2026, 0, 12))` → "Lundi 12 décembre 2026" instead of "…janvier…";
every month is off by one (January wraps to December of the same year). `toMonthName` itself is
correct — `WeekSelector.jsx:36` passes it a 1-based month. The only broken caller is this one.
User-visible in the create-activity modal date header (`planning/CreateActivityModal.jsx:67,112`).
Fix: `toMonthName(tmpDate.getMonth() + 1)`. `constants.test.js` / `format.test.js` deliberately
assert only the weekday token of `toFullDateFr` output so as not to pin the bug.

## `parameters` domain — remaining structural / dead-code items

The i18n-06 `parameters` domain (lots A–F, `feature/i18n-06-parameters-lot-*`) is functionally
complete, and its own verbatim-typo catalogue was folded into the "Locale-file verbatim typos"
section above — fully resolved as of `fix/known-issues-easy-batch`. `feature/i18n-parameters-shared-
consolidation` additionally folded every byte-identical `parameters:*` duplicate flagged across
lots A–E3 into a `shared.*` block (`parameters.json` 255 → 233 leaves) — `shared.colName`,
`shared.colLabel`, `shared.deleteStatusConfirm`, `shared.saveCompleted`, `shared.genericErrorShort`,
`shared.saveSuccessTitle`, plus folding three separate loading-title copies into `common:loading`.

What's still open in this domain:

- **Cross-namespace duplicate that can't be folded into `shared.*`**: the "no level set" concept
  has three separate keys, one per namespace — `activityApplications:summaryActivity.notSpecified`,
  `courses:lessonList.userRow.notSpecified`, `planning:levelDisplay.notIndicated` (all "NOT
  SPECIFIED" in EN). `shared.*` lives inside `parameters.json`, so it can't reach across namespaces.
- **`editParameters/DragAndDrop.jsx` is a shared component locked to the `parameters` namespace** —
  `useTranslation("parameters")` for a component with 4 call sites across *three* i18n domains
  (`editParameters/{RulesSettings,SchoolParameters}.jsx`,
  `parameters/ActivityApplications/ConsentDocumentModal.jsx`, and `activityRef/ActivityRefBasics.jsx`
  — the last one is the `activities` domain). Harmless today (every namespace loads eagerly), but
  a future lazy-namespace split would break the `activityRef` caller silently. Move its strings to
  `common:dragAndDrop.*`.
- **Possible dead code** (do not delete — recover-don't-delete policy): `parameters/Rooms/
  RoomsParameters.jsx` isn't mounted by any core view (`rooms_parameters/index.html.erb` mounts
  `Rooms/Localisations` directly); its only key is exercised solely by the parity test.
  `editParameters/FormulesParameters` is referenced by
  `formules_parameters_edit.html.erb`'s `react_component` call but **the component file doesn't
  exist** under `frontend/components/editParameters/` — likely a dead route or a plugin-provided
  component. Audit against activated plugins / prod logs before touching either.
- **Mixed-language side effect of planning lot 3c, `KindLegend` half resolved by constants-i18n
  lot 3**: `SimplePlanning.jsx` renders `<KindLegend>` right below the level line lot 3c
  localized — `tools/constants.js` `KINDS_LABEL` now follows the active language too (lot 3), so
  that particular mismatch is gone. Still open: `ActivitiesApplicationsList.jsx`'s column headers
  ("Niveau", "Âge", "Activité" and 10 more) are still hardcoded French next to its now-localized
  level cell and Action column.
- **Pre-existing dead guard** in `courses/LessonList.jsx`: `UserRow` seeds `studentLevel` from
  `data.evaluation_level_ref.label`, but `desired_activity_controller.rb:92` renders
  `evaluation_level_ref` as a bare **string**, so `.label` on it is always `undefined` and the
  `studentLevel === LEVEL_NOT_INDICATED` fast path never fires — every row falls through to the
  `levelDisplayForActivity` recompute. `Activity.jsx:44` handles the same endpoint correctly
  (no `.label`). Fix `LessonList` to match.

Design note (`planning/TimeIntervalHelpers.jsx`, lot 3c — so a later reader doesn't "simplify" it):
`levelDisplay()` / `levelDisplayForActivity()` keep returning the raw French sentinels
(`LEVEL_NOT_INDICATED = "NON INDIQUÉ"`, `LEVEL_TO_SPECIFY = "À PRÉCISER"`, both exported constants)
so `===` call-site comparisons stay locale-stable; a separate `levelDisplayLabel(value)` localizes
only at render via `i18n.t("planning:levelDisplay.*")`, passing any real level label through
unchanged. Every call site was split into "compare" (use the constant) vs "display" (wrap in
`levelDisplayLabel`) — touched `Activity.jsx`, `LessonList.jsx`, `ActivitiesApplicationsList.jsx`,
`Calendar.jsx`, `SimplePlanning.jsx`, `RawPlanning.jsx`.

`frontend/components/planning/TimeInterval.jsx` was left untouched by lot 3c: its `levelDisplay()`
method is a stub (`return "Banana";`, the rest commented out) and it has its own separate hardcoded
`` `${averageAge} ans` ``. Broken legacy component, not extracted (don't-delete-on-looks-dead).

## `frontend/components/common/baseDataTable/BaseDataTable.jsx` — hardcoded French chrome leaks into English

The **functional** shared data-table (`frontend/components/common/baseDataTable/`, distinct from
the older class-based `frontend/components/parameters/BaseDataTable.jsx`) builds its modal
titles from hardcoded French templates and passes hardcoded react-table pagination strings:

- `` `Mettre à jour ${oneResourceTypeName}` `` / `` `Créer ${oneResourceTypeName}` `` /
  `` `Supprimer ${oneResourceTypeName}` `` / `` `Voulez-vous vraiment supprimer ${thisResourceTypeName || "cet élément"} : ${…} ?` `` (around `BaseDataTable.jsx:287-298`)
- `previousText="Précédent"` / `nextText="Suivant"` / `ofText="sur"` / `rowsText="résultats"` /
  `noDataText="Aucune donnée"` (`BaseDataTable.jsx:270-274`) — `common:reactTable.*` already exists.

Call sites that pass a (now-translated, as of the respective i18n lot) `oneResourceTypeName` /
`thisResourceTypeName` into it, producing **mixed-language** modal headers in English mode
("Créer a discount rate", "Supprimer a discount rate"):
- `parameters/Payments/Coupons.jsx:59-60` (i18n-06 parameters lot C)
- `activityRef/ActivityRefBasics.jsx:~327` (i18n-06 activities lot 2)
- `formules/EditFormule.jsx:~510` (i18n-06 formules)

Latent, same file: `const tableName = "table-" + oneResourceTypeName` (`BaseDataTable.jsx:~109`)
feeds a `reactTableFullscreen${tableName}Change` custom-event name (`ReactTableFullScreen.jsx`),
so a previously-constant event name is now locale-derived. Dispatcher and listener stay consistent
within one page load, and `Coupons` passes `showFullScreenButton={false}`, so impact today is nil.

This whole component wants its own extraction pass (a `common:` namespace + `useTranslation` for
the fn body); it was out of scope for every lot that fed it a translated resource name.
