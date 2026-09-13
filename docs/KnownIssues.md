# Known issues

Tracked bugs/gaps that are known but deliberately not fixed yet, with enough detail to pick back up
later. When one gets fixed, remove its entry (the fix's commit message/PR is the record, not this
file). Keep entries short: state the problem, why it's deferred, and where to look — don't restate
an entire investigation's blow-by-blow here once the fix lands, and don't leave "fixed" bullets
sitting around as history. General i18n extraction conventions/gotchas (not bugs) live in
`docs/I18n-Extraction-Gotchas.md` instead of here.

## Minitest feature specs (`test/features/`) can't load — Capybara spec DSL, not a browser/asset gap

All three `test/features/*_test.rb` files use Capybara's spec DSL (`feature`/`scenario`) at the top
level, but the installed `minitest-rails` gem only aliases those onto `ActionDispatch::SystemTestCase`
(`.../gems/minitest-rails-6.1.1/lib/minitest/rails/capybara.rb`), not onto a plain `describe` block.
Every `scenario` call raises `NoMethodError` at load time, and `bin/rails test` (no args) loads all
three, blocking every other Minitest file unless `test/features` is excluded from the run.

Not a missing browser driver — only bare `capybara` is in the Gemfile (no selenium/cuprite), so
`Capybara.default_driver` is the headless, JS-free `:rack_test`, which is enough for what these files
do. Fix: swap `feature`/`scenario`/`must_have_content` for plain `test "..." do` +
`Capybara::Minitest::Assertions`, and wire up route helpers + a configured `Capybara.app` in
`test/test_helper.rb` (currently only `require "minitest/rails/capybara"`). Two of the three files
have most of their bodies already commented out, so the payoff is small until someone also writes the
tests back in. No CI runs either test suite today (`.github/workflows/` is release-only), which is why
this drifted unnoticed.

## Frontend dependencies: major-version bumps still pending

Surveyed 2026-08-27, updated after `feat/bump-shakapacker` (2026-09-05) cleared most of the list: the
webpack+babel+postcss toolchain was replaced by rspack+swc, React went 16→17, several libraries were
bumped across majors, and a few unmaintained ones were dropped. What's left:

- **React 17 → 19**, two majors, real breaking boundaries: legacy string refs/legacy context API are
  removed in 19 (grep the ~118 class components first); `ReactDOM.render` is gone from 18+
  (`react_ujs`, currently `^2.4.3`, needs bumping in lockstep); React 18 changes effect/StrictMode
  timing enough to surface latent class-component lifecycle bugs. Stage 17→18 first, prove it out,
  then 18→19. `@testing-library/react` is pinned at `^12.1.5` until React moves past 17.
- Downstream of the React bump (pinned below latest, bump after React itself): `react-select`,
  `react-table`, `react-toastify`, `react-loader-spinner`, `react-autosuggest`, `react-switch`.
- Independent, real API-surface jumps: `sweetalert2` 7→11 (callback API → promises, dozens of call
  sites to review), `bootstrap` 4→5 (drops jQuery, markup/class changes — watch for the transitive
  `bootstrap@3` pull-in that bit `feat/bump-shakapacker` once already), `prettier` 1→3 (would reformat
  large parts of the codebase in one commit).
- `shakapacker` 9.3.0 → 10 (one more major). Smaller/lower priority: `jquery` 3→4, `sass-loader`
  16→17. `jsdom` 26→30 is unblocked now that Node is on 22, still pending.

## Exotic (git-pinned) dependencies need a per-package decision, not a version bump

4 dependencies resolve to a git ref rather than a registry version (no real "how far behind"
comparison from `yarn outdated`): `jQuery-QueryBuilder`, `jQuery-QueryBuilder-Elasticsearch`,
`react-stepzilla`, `tui-calendar`. None pinned to a commit SHA, so each can change underneath the app
with zero lockfile signal. For each, the real question is un-fork vs. patch-and-pin vs. replace —
researched via `gh api` fork/compare metadata 2026-08-27:

- **`tui-calendar`** — highest effort. Upstream (`nhn/tui.calendar`) is healthy and active, but the
  fork (`SIXMON/tui.calendar`) is 1426 commits behind with 14 commits of real app-specific behavior
  (data-model conformance, scheduling-precision tweaks). Un-forking means re-implementing those 14
  commits against a version 1426 commits newer — scope carefully before starting.
- **`react-stepzilla`** — smallest gap (2 commits behind, 3 ahead with legitimate-looking upstreamable
  bug fixes). Reasonable candidate to upstream the fix and drop the fork.
- **`jQuery-QueryBuilder`** — trivial fork (1 commit ahead, 48 behind, active upstream). Lowest-risk
  candidate to drop the fork and pin an upstream release.
- **`jQuery-QueryBuilder-Elasticsearch`** — not a fork of anything, abandoned since 2016, no drop-in
  replacement found. May need vendoring/reimplementing rather than un-forking or swapping.

Whatever the per-package decision, pin to an exact commit SHA (or npm release) in the meantime —
that alone removes the "can silently change under us" risk before the fork-vs-replace call is made.

## Dead/unrouted code awaiting a plugin + production audit

This app prepends plugin routes before its own (`CLAUDE.md`'s plugin system section), so a 500
(`AbstractController::ActionNotFound`), an unconditional redirect, or "no route in this checkout"
does **not** prove something is truly unused — an activated plugin can supply the missing
route/action, or a DB-stored `NotificationTemplate` (Liquid/WYSIWYG, outside static grep) could
still link to it. Recover-don't-delete policy applies to everything below until someone audits
activated plugins + production request logs / `NotificationTemplate` bodies.

- `app/views/devise/passwords/edit.html.erb` — Devise's own `edit_user_password_url` route
  (`PasswordsController#edit`) renders this, but the actual reset-password email
  (`DeviseMailer#reset_password_instructions`) links to a different, custom route
  (`edit_password_url` → `UsersController#edit_password`) instead. No `edit_user_password_path`/`_url`
  call exists anywhere in `app/`. Checked the local dev/test DB's `NotificationTemplate` rows for a
  reference — none found, but that DB only has 1 seed row, so this doesn't rule out production.
- `app/controllers/static_pages_controller.rb` (`landing`, `about`) and their views — no matching
  route in `config/routes.rb` (confirmed by grep and by a live `GET /about` raising
  `ActionController::RoutingError`). `app/views/layouts/static_pages.html.erb` still references
  `about_path`, which would itself raise `NoMethodError` if ever rendered.
- `app/views/admin/edit_mail_settings.html.erb` — no route or controller action (`AdminController`
  has no `edit_mail_settings` method). Its live equivalent is
  `ParametersController#mails_parameters_edit`. Looks like a leftover from before the `parameters`
  controller consolidation.
- `RemoveController#get_references` never renders its return value over HTTP — the endpoint always
  responds `204 No Content` (Rails' implicit-render fallback), since the action computes an array but
  never calls `render` and there's no `app/views/remove/get_references.*` template. No
  `frontend/**` caller of `/references/:classname/:id` was found either (`RemoveComponent.jsx` only
  calls the plain `generic_destroy` delete route). Either dead code with no consumer, or a plugin
  supplies the render in production — needs the same audit as the rest of this section.
- `frontend/components/WorkGroupTemplateEditor.jsx` (root-level `WorkGroupEditor`) — superseded by
  `frontend/components/activityRef/WorkGroupTemplateEditor.jsx` (the only real import site) and not
  mounted via any `react_component`.
- `frontend/components/parameters/Rooms/RoomsParameters.jsx` isn't mounted by any core view
  (`rooms_parameters/index.html.erb` mounts `Rooms/Localisations` directly); its only key is
  exercised solely by the i18n parity test. `editParameters/FormulesParameters` is referenced by
  `formules_parameters_edit.html.erb`'s `react_component` call but **the component file doesn't
  exist** under `frontend/components/editParameters/` — likely a dead route or a plugin-provided
  component.
- Rails-scaffold placeholder views with no route reaching them for a real render:
  `app/views/practice/bands/_form.html.erb` (bands new/edit mount React; failure paths never hit the
  scaffold form), `activity/remove.html.erb`, `activity_instance/{delete,update}.html.erb`,
  `activity_ref/{create,update}.html.erb`, `activities_applications/create.html.erb`,
  `comments/{create,update,destroy}.html.erb`, `time_interval/validate.html.erb`,
  `family_members/destroy.html.erb`, `family_member_users/destroy.html.erb`,
  `evaluation_level_ref/show.html.erb`, `payment_statuses/show.html.erb`,
  `due_payment/update.html.erb`, `payment_method` (no `show` action, but `resources` still routes it).

## Rubocop backlog

`rubocop` was added 2026-08-26; a safe-autocorrect pass plus a case-by-case triage of
`Lint/DuplicateMethods`/`Lint/MissingSuper`/`Style/ClassVars` and a full audit of
`Style/FrozenStringLiteralComment` have all landed. Current count: **1037 offenses across 214 files**
(`bundle exec rubocop`), none of them from those four cops. What's left:

- `Layout/LineLength` (~488) — rubocop's corrector can only reflow what it can mechanically split;
  the rest need a human call on how to wrap.
- The remaining offenses are spread across cops needing real code changes rather than reformatting
  (`Style/OptionalBooleanParameter`, `Naming/VariableName`, `Naming/AccessorMethodName`, a long tail
  of *unsafe*-correctable style cops) — a future, more surgical pass, not a blind `-A`.
- `Style/Documentation` is disabled in `.rubocop.yml` (conflicts with this repo's no-boilerplate-
  comments convention) — not a backlog item, a deliberate config choice.
- 17 `Lint/Syntax` offenses in `lib/generators/elvis_plugin_model/templates/migration.rb` are not a
  real offense — it's an ERB-templated generator source with a `.rb` extension, never valid
  standalone Ruby.

## i18n PRs #7–#10 never got a specialized code-review pass

`extract-users`, `extract-evaluation`, `extract-payments`, `common-react-table-keys` were reviewed
inline only, before the process switched to routing every i18n PR through the specialized
`code-reviewer` agent (PR #11 onward). Still open but low priority — every one of them has since been
re-touched, tested, and reviewed by later lots, so a fresh full-codebase review would be more useful
than re-reviewing an isolated 2026-08 diff.

## Translated UI frozen at construct/mount time (harmless — locale switch is a full page reload)

Several components resolve `t(...)` once — in a constructor, `componentDidMount`, or a module-level
call — and store the result in `state`/a closure instead of re-deriving it on `render()`, so an
in-page `i18n.changeLanguage()` wouldn't update them. **This is currently harmless everywhere it
occurs**: this app's language switcher (`LocaleController#update`) does a full server-side
PATCH+redirect, so no React island survives an actual locale change. It becomes a real bug only if
something ever calls `i18n.changeLanguage()` in-page, or two differently-localized islands render on
the same page at once. Fix (if it ever matters) is mechanical: move the string resolution into
`render()`/a live `useTranslation()` read.

Affected, for whoever eventually does that pass:
- `planning/Calendar.jsx` — tui-calendar's `week.daynames` and its template functions capture
  mount-time `t` (day-name headers, "N autres", "Présences"); `CalendarControls` and the schedule
  title are already live.
- `DuePaymentList.jsx`, `PaymentList.jsx`, `PaymentScheduleList`, `activities/ActivityRefKind.jsx`,
  `activities/Instruments.jsx`, `parameters/BaseDataTable.jsx` (can't be `withTranslation`-wrapped,
  ~15 CRUD tables extend it), the 5 `*Parameters.jsx` tab wrappers, the 7
  `parameters/Practice/*.jsx` CRUD tables, `parameters/Payments/{PaymentsMethods,PaymentsStatus}.jsx`,
  `parameters/Evaluations/EvaluationLevels.jsx`, `parameters/Rooms/Localisations.jsx` — all build
  react-table `columns`/tab names/messages with the constructor's `t`.
- `courses/LessonList.jsx`'s `message.title` default (constructor-evaluated); its 12 react-table
  column headers are already rebuilt in `render()`.
- `frontend/components/common/baseDataTable/BaseDataTable.jsx` — a fetch-error message is resolved
  once and stored in state, so it can show the previous language's text until the next fetch.
- `advancedSearch/utils.js`'s `getQueryBuilderLangCode()` — read once at widget construction
  (jQuery-QueryBuilder isn't react-i18next, has its own separate i18n mechanism).

Two extra wrinkles worth flagging on top of the general pattern (not just "same as above"):
- Several of the tables above (`parameters/Practice/*`, `parameters/Payments/*`,
  `EvaluationLevels.jsx`, `Localisations.jsx`) call `this.props.t` **live** inside `deleteStatus()`
  while their `columns`/`Cell` closures stay frozen — an in-page language change would show a
  mixed-language table (frozen headers, live delete-confirm dialog).
- `Localisations.jsx` additionally reads live `this.props.t` for the `common:reactTable.*`
  pagination props in `render()` while `state.columns` stays frozen — three different freshness
  states on one table.

## Frontend date formatting hardcodes `Europe/Paris` — not per-installation configurable

`courses/LessonList.jsx` and `activityApplications/summary/Activity.jsx` format `begin_at`/
`stopped_at` with an explicit `timeZone: "Europe/Paris"` (each its own `PARIS_DATE_FORMAT_OPTIONS`
constant) — correctly, since those fields are Paris-zone timestamps at local midnight
(`config.time_zone = "Paris"`, `config/application.rb:50`) and the browser's own zone would silently
roll the displayed date back a day for anyone west of Paris. This fixes today's single-tenant
deployment but doesn't generalize: if Elvis is ever installed for a school outside the Paris
timezone, both the backend `config.time_zone` and these two frontend constants would need to become
a per-installation `Parameter`/`Settings` value rather than a source constant. Flagging so a future
non-Paris deployment doesn't reintroduce the same day-off-by-one bug in reverse.

## Known duplicate translation keys (intentional, not deduped)

Each is a separate key expressing the same concept in a different namespace/component, kept apart to
avoid a cross-domain restructuring outside any single extraction batch's scope:
- "No level set": `activityApplications:summaryActivity.notSpecified`,
  `courses:lessonList.userRow.notSpecified`, `planning:levelDisplay.notIndicated`.
- `common:kindsLabel` duplicates `planning:kinds` (Cours/Course, Option, Évaluation/Evaluation).
- `activityChoice.*`/`formulaChoice.*`/`selectedActivitiesTable.*`/`validation.col*` in
  `activityApplications.json` redeclare "Récapitulatif"/"Durée"/"Tarif estimé"/"Rechercher" per
  component; "no activity selected" has three near-duplicate keys across the same three namespaces.

A shared sub-block per namespace would fold each of these — not attempted piecemeal to avoid
restructuring ad hoc across already-merged domains.

## A few small, deliberately-deferred product/UX calls

- `parameters/Payments/AdhesionSettings.jsx` / `AdhesionEditModal.jsx`: `initialValues.label`
  defaults to the translated string `t("payments.adhesion.modal.defaultLabel")`. If an EN-locale
  admin leaves the field untouched, that literal English string gets persisted as data — should be
  an explicit server-side default, not a client i18n key.
- `editParameters/SchoolParameters.jsx`'s `contactPhone` field has the same "always shows Required,
  never Invalid" shape the `email` field had before it was fixed (no `phoneInvalid` key) — not yet
  fixed, was out of scope for the batch that fixed `email`.
- `frontend/components/utils/StopReasons.ts`'s `unsuitableLevel` (id 2) and `levelNotSuitable` (id 8)
  render identical text in both fr and en — two dropdown options a user can't tell apart. Faithfully
  preserved as-is during extraction (not a content redesign); needs a product decision on whether one
  should be reworded or merged.
- The seeded `label` columns on `PaymentStatus`/`DuePaymentStatus`/`ActivityApplicationStatus`/
  `PaymentMethod`/`EvaluationLevelRef` remain hardcoded French — deliberately out of scope for the
  i18n rollout. They're DB rows (`find_or_create_by!` at class load) that are admin-editable at
  runtime, closer to `Parameter`/`NotificationTemplate` per-instance content than static UI chrome.
- `frontend/tools/format.jsx`'s `toFullDateFr` always renders `<weekday> <day> <month> <year>`
  (French field order) even in English mode, rather than a US-style "January 12, 2026". Defensible
  given the function name and its one consumer (`planning/CreateActivityModal.jsx`'s date header) —
  flag if this function's scope ever grows.
- `HoursSheet.jsx` passes `this.props.minYear`/`maxYear` straight to `DateFilter.tsx`'s
  `RangedSelect`, which throws if either arrives as a non-integer. Not currently reachable
  (`users_controller.rb`'s `@min_year`/`@max_year` are always Ruby `Integer`s), but a fragile
  implicit contract — harden with a `Number(...)` coercion if that ever changes.

## `Activity#teacher` is N+1-prone independent of `.includes()`

`Activity#teacher` (`app/models/activity.rb`) is a plain Ruby method
(`teachers_activities.where(is_main: true).map(&:teacher).first`), not an AR association — calling
`.where` on an already-preloaded `has_many` bypasses the preloaded array and issues a fresh query
every time, regardless of any `.includes()` upstream. `ActivitySerializer`'s per-activity `teacher`
lookup (used by `season_activities`/`evaluate`) hits this on every activity in a collection. Real,
pre-existing, not introduced by any recent change. Fixing it means changing `Activity#teacher` itself
to read from an already-loaded `teachers_activities` array in Ruby — a model-behavior change, not
attempted as part of unrelated work.

