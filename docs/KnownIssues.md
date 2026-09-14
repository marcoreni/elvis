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

Surveyed 2026-08-27, updated after `feat/bump-shakapacker` (2026-09-05) cleared most of the list:
the webpack+babel+postcss toolchain was replaced by rspack+swc, React went 16→17, several
libraries were bumped across majors, and a few unmaintained ones were dropped. Re-checked
2026-09-14 — `shakapacker` (10.3.2), `jsdom` (30), `sass-loader` (17.0.1), `react-select` (5.x,
current latest), and `prettier` (3.9.6) are already done; removed from the list below. What's
left:

- **React 17 → 19**, two majors, real breaking boundaries: legacy string refs/legacy context API are
  removed in 19 (grep the ~118 class components first); `ReactDOM.render` is gone from 18+
  (`react_ujs`, currently `^2.4.3`, needs bumping in lockstep); React 18 changes effect/StrictMode
  timing enough to surface latent class-component lifecycle bugs. Stage 17→18 first, prove it out,
  then 18→19. `@testing-library/react` is pinned at `^12.1.5` until React moves past 17.
- Downstream of the React bump (pinned below latest, bump after React itself): `react-table`,
  `react-toastify`, `react-loader-spinner`, `react-autosuggest`, `react-switch`.
- Independent, real API-surface jumps: `sweetalert2` 7→11 (callback API → promises, dozens of call
  sites to review — see roadmap item 7), `bootstrap` 4→5 (drops jQuery, markup/class changes —
  watch for the transitive `bootstrap@3` pull-in that bit `feat/bump-shakapacker` once already).
- Smaller/lower priority: `jquery` 3→4.

## Exotic (git-pinned) dependencies need a per-package decision, not a version bump

1 dependency resolves to a git ref rather than a registry version (no real "how far behind"
comparison from `yarn outdated`): `react-stepzilla`. (`jQuery-QueryBuilder`/
`jQuery-QueryBuilder-Elasticsearch` were removed with Elasticsearch/chewy; `tui-calendar` was
removed by roadmap item 6 Step B, PR #104.) Not pinned to a commit SHA, so it can change underneath
the app with zero lockfile signal. Real question is un-fork vs. patch-and-pin vs. replace —
researched via `gh api` fork/compare metadata 2026-08-27: smallest gap of the two originally
surveyed here (2 commits behind, 3 ahead with legitimate-looking upstreamable bug fixes) — reasonable
candidate to upstream the fix and drop the fork. Pin to an exact commit SHA (or npm release) in the
meantime — that alone removes the "can silently change under us" risk before the fork-vs-replace
call is made.

## Devise passwords/edit — reachable but unlinked, not dead

`app/views/devise/passwords/edit.html.erb` is still rendered by Devise's own stock route
(`edit_user_password_url` → `PasswordsController#edit`), but the app's own reset-password email
(`DeviseMailer#reset_password_instructions`) links to a different, custom route
(`edit_password_url` → `UsersController#edit_password`) instead. Not dead code — just unlinked
from the one email flow that would normally lead there. Unclear if intentional; not touched.

## `editParameters/FormulesParameters` component missing

`app/views/parameters/formules_parameters_edit.html.erb` calls
`react_component("editParameters/FormulesParameters", ...)`, but
`frontend/components/editParameters/FormulesParameters.jsx` doesn't exist — a live route with no
implementation (the opposite of dead code). Needs its own investigation.

## Rubocop backlog

`rubocop` was added 2026-08-26; a safe-autocorrect pass plus a case-by-case triage of
`Lint/DuplicateMethods`/`Lint/MissingSuper`/`Style/ClassVars` and a full audit of
`Style/FrozenStringLiteralComment` have all landed. Current count (2026-09-15):
**973 offenses across 206 files** (`bundle exec rubocop`), none of them from those four cops. An
audit of the safe-autocorrect commits themselves (2026-09-15, prompted by a real regression one of
them caused — see `app/controllers/activity_controller.rb`'s permission-gate fix, PR #108) found no
other instances of that bug: RuboCop's `Lint/EmptyConditionalBody` autocorrect can silently merge a
sibling branch's code into the wrong conditional path when the branch it's collapsing has an empty
body, but that pattern only fired once across all 4 autocorrect commits. What's left:

- `Layout/LineLength` (~349) — rubocop's corrector can only reflow what it can mechanically split;
  the rest need a human call on how to wrap.
- The remaining offenses are spread across cops needing real code changes rather than reformatting
  (`Style/OptionalBooleanParameter`, `Naming/VariableName`, `Naming/AccessorMethodName`, a long tail
  of *unsafe*-correctable style cops) — a future, more surgical pass, not a blind `-A`.
- `Style/Documentation` is disabled in `.rubocop.yml` (conflicts with this repo's no-boilerplate-
  comments convention) — not a backlog item, a deliberate config choice.
- 17 `Lint/Syntax` offenses in `lib/generators/elvis_plugin_model/templates/migration.rb` are not a
  real offense — it's an ERB-templated generator source with a `.rb` extension, never valid
  standalone Ruby.

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
- `PluginActivationModal.jsx`'s `handleConfirm` does `await handleSaveAndRestart()`, but that
  function is synchronous (fires an async API call internally and returns `undefined`) — the
  `await` resolves immediately, before the actual save completes. Its `.success`/`.error`
  callbacks (not the `await`) drive `closeModal()`, so this is harmless today, but the `await`
  reads as if it's waiting for the save to finish and doesn't.
- `planning/Planning.jsx`'s `beforeDeleteSchedule` prop (`:1535-1537`) passes the whole
  `{schedule}` event wrapper into `handleDeleteInterval(id)`, which does `intervalStore[id]` — since
  `id` is actually an object, this coerces to the string `"[object Object]"` and never matches a
  real interval. Confirmed during the tui-calendar -> FullCalendar v6 migration (roadmap item 6)
  while mapping every consumer of the calendar's schedule/interval shape: every *working* delete
  path in the app (`PauseDetailModal`, `ActivityDetailsModal`, the detail-modal delete buttons)
  calls `handleDeleteInterval` directly with a plain id instead. `beforeDeleteSchedule` also has no
  real trigger in the app today — nothing in the UI fires it (tui-calendar only fired it from its
  own built-in delete-popup button, which the app explicitly disabled via `useDetailPopup: false`)
  — so this is dead *and* broken, with zero test coverage. Preserved as-is (not fixed) during the
  migration to keep that PR's blast radius to the calendar-engine swap only; fix is to pass a plain
  id through instead of the wrapper, whenever a real trigger for it is added.

## `Activity#teacher` is N+1-prone independent of `.includes()`

`Activity#teacher` (`app/models/activity.rb`) is a plain Ruby method
(`teachers_activities.where(is_main: true).map(&:teacher).first`), not an AR association — calling
`.where` on an already-preloaded `has_many` bypasses the preloaded array and issues a fresh query
every time, regardless of any `.includes()` upstream. `ActivitySerializer`'s per-activity `teacher`
lookup (used by `season_activities`/`evaluate`) hits this on every activity in a collection. Real,
pre-existing, not introduced by any recent change. Fixing it means changing `Activity#teacher` itself
to read from an already-loaded `teachers_activities` array in Ruby — a model-behavior change, not
attempted as part of unrelated work.

