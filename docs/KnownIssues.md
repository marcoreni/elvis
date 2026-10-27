# Known issues

Tracked bugs/gaps that are known but deliberately not fixed yet, with enough detail to pick back up
later. When one gets fixed, remove its entry (the fix's commit message/PR is the record, not this
file). Keep entries short: state the problem, why it's deferred, and where to look — don't restate
an entire investigation's blow-by-blow here once the fix lands, and don't leave "fixed" bullets
sitting around as history. General i18n extraction conventions/gotchas (not bugs) live in
`docs/I18n-Extraction-Gotchas.md` instead of here.

## Serializer cycle can `SystemStackError` when rendering a `TimeInterval` with an `activity_instance`

Symptom: rendering a `TimeInterval` (directly or via `include:`) whose `activity_instance` is set can
raise `SystemStackError` (stack level too deep).

Root cause: the app-wide `default_includes = "**"` (`config/initializers/active_model_serializer.rb`)
walks includes recursively, and `TimeIntervalSerializer` -> `activity_instance` ->
`ActivityInstanceSerializer` -> `activity` -> `ActivitySerializer` -> `time_interval` is a real cycle
in the data once an interval's `activity_instance` points back to an activity that references that
same interval (see the duplicate-avoidance check in `Activity#create_instances`,
`app/models/activity.rb` around lines 91-92, which is what makes this cycle close in practice).

Fixed in `ActivityController#create`'s final render (see git history for that fix). Same bug is still
unpatched at these 4 sites, which serialize an interval/activity through the identical cycle with no
`include: []` guard (reproduced as a `SystemStackError` on one of them):

- `app/controllers/planning_controller.rb:411`
- `app/controllers/planning_controller.rb:704`
- `app/controllers/activity_instance_controller.rb:18`
- `app/controllers/time_interval_controller.rb:246` (closest analogue to the fixed case — its
  `create_activity_instances` action is a near-copy of `ActivityController#create`)

Fix pattern: add `include: []` to the render/serializer call at each site (safe wherever the response
body's nested includes aren't actually consumed by the caller — check each call site's frontend
consumer before applying).

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

- **React 17 → 19** — both majors now done; see `docs/Modernization-Roadmap.md` items 14 and 15.
- `react-switch`/`react-loader-spinner`/`react-toastify` were all in the "pending version bump"
  bucket — all three now done (`7.1.0` on `chore/bump-react-switch`, `8.0.2` on
  `chore/bump-react-loader-spinner` PR #140, `11.1.0` on `chore/bump-react-toastify`). `react-
  autosuggest` was also in this bucket, but turned out to be a dead dependency instead — removed
  outright; see `docs/OrphanedCode.md`.
- Independent, real API-surface jumps: `sweetalert2` 7→11 (callback API → promises, dozens of call
  sites to review — see roadmap item 7), `bootstrap` 4→5 (drops jQuery, markup/class changes —
  watch for the transitive `bootstrap@3` pull-in that bit `feat/bump-shakapacker` once already).
- Smaller/lower priority: `jquery` 3→4.

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
- `DuePaymentList.jsx`, `PaymentList.jsx`, `PaymentScheduleList`, `activities/ActivityRefKind.jsx`,
  `activities/Instruments.jsx`, `parameters/BaseDataTable.jsx` (can't be `withTranslation`-wrapped,
  ~15 CRUD tables extend it), the 7 `parameters/Practice/*.jsx` CRUD tables,
  `parameters/Payments/{PaymentsMethods,PaymentsStatus}.jsx`,
  `parameters/Evaluations/EvaluationLevels.jsx`, `parameters/Rooms/Localisations.jsx` — all build
  react-table `columns`/messages with the constructor's `t`.
- The 5 `*Parameters.jsx` tab wrappers (`Community`/`Payments`/`Practice`/`Plannings`/
  `Evaluations`/`Activities`/`ActivityApplications` — all of `parameters/<Domain>/<Domain>Parameters.jsx`)
  used to freeze their tab names at whatever read `t(...)` once: either the wrapper's own
  constructor (`Community`/`Payments`/`Practice`/`Evaluations`, before the jsx-to-tsx batch 1
  conversion) or `BaseParameters`'s own `componentDidMount`-era constructor read of
  `props.tabsNames`. Since that conversion (`parameters/BaseParameters.tsx`), the wrapper side of
  that is gone — all 5 are now plain functions calling `useTranslation` live, with only
  `PlanningsParameters.jsx` still built as one (it never had a constructor; it already passed
  `tabsNames` as a prop before the conversion). The freeze itself didn't go away, though — it's
  now fully centralized in `BaseParameters.tsx`'s `tabsNamesRef = useRef(tabsNames)`, which still
  only reads its `tabsNames` prop once, deliberately (see the playbook's "componentDidMount-only"
  trap). This leaves `BaseParameters.tsx` internally inconsistent: `tabsNames` is frozen via that
  `useRef`, while `divObjects` is kept live (plain prop read / a prop-sync effect, depending on
  which lands first). A hypothetical in-page language change would show stale tab labels over
  fresh panes. Not fixed here — the freeze is the playbook's deliberate trade-off, preserving the
  original class's "once-only" semantics; this bullet is just updated to describe where the
  staleness actually lives now.
- `courses/LessonList.jsx`'s `message.title` default (constructor-evaluated); its 12 react-table
  column headers are already rebuilt in `render()`.
- `frontend/components/common/baseDataTable/BaseDataTable.jsx` — a fetch-error message is resolved
  once and stored in state, so it can show the previous language's text until the next fetch.

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

## Found while smoke-testing the tui-calendar -> FullCalendar migration (2026-09-14)

None of these are caused by or related to that migration (confirmed: none of the affected files are
in its diff) — logged here as found, not investigated further.

- `parameters/planning_parameters#tab-0`: "Error while fetching the availabilities" on load; creating
  an availability 500s (`PATCH /plannings/availabilities/:id`).
- `/evaluation_level_ref/new`: sidebar highlights "Registrations" instead of the Evaluations section.
- Still-French UI strings outside the i18n rollout: "Lieu"/"Fermer" labels somewhere in the app, and
  `/scripts/replicate_week_activities` is entirely un-extracted.
- Active locale intermittently reverts to `fr` mid-session even with `en` selected, then recovers on
  a later navigation — seen between "Registration - New Registration" and "Registration - settings",
  not yet reproduced systematically enough to isolate.
- `/seasons/:id/edit`: no edit button/affordance for existing holidays (only, presumably, add/delete)
  — not investigated further, flagged during the same testing pass.

## `TimeIntervalHelpers.omitInactiveStudents` forces an `as unknown as` cast in Calendar.tsx

`omitInactiveStudents` (`frontend/components/planning/TimeIntervalHelpers.jsx:45`) is
`_.differenceBy(users, inactiveStudents, 'id')` in a plain untyped `.jsx` file. Calling it from
`Calendar.tsx` (`:239`), TS infers a bogus `string[]`-shaped return from lodash's overload
resolution rather than `User[]` — a direct `as User[]` fails with TS2352 ("neither type
sufficiently overlaps"), so the call site needs `as unknown as User[]`. Per the [JSX-to-TSX
playbook](Jsx-To-Tsx-Migration-Playbook.md), `as unknown as T` should be avoided in favor of real
types; this one is logged rather than silently cast because it's blocked on `TimeIntervalHelpers.jsx`
itself having no types to cast *from* — real fix is migrating that file to `.ts`/`.tsx` (it has one
other caller, `ActivityDetailsModal.jsx`, unaffected either way since that caller is also untyped
JS) or giving `omitInactiveStudents` an explicit typed signature.

## Orphaned code left in place after the TanStack migration (batch 4b, item 13)

Not deleted per this repo's standing policy on unused-looking code — logged instead:

- `frontend/components/utils/DateFilter.tsx`'s default export (`DateFilter`) has no importer
  anywhere in `frontend/`; every real caller (`HoursSheet.jsx`) uses the named `RangedSelect`
  export instead.
- `frontend/components/generalPayments/SubPaymentList.jsx` no longer reads its `minYear`/`maxYear`
  props (dropped along with the v6-only column `Filter` render props during the TanStack
  migration, since table-level `filterable={false}` already disabled them regardless). Its one
  caller, `DuePaymentList.jsx` (`:1163-1164`), still passes both — harmless, just now inert.
- `frontend/components/parameters/BaseParameters.module.css` (`.test { margin-top: 400px }`) is
  imported by nothing — found adjacent to `BaseParameters.tsx` during jsx-to-tsx batch 1, predates
  that conversion.
- `frontend/components/parameters/Plannings/SchoolAvailabilities.tsx`'s `setSeason` is declared
  (`const [season, setSeason] = useState(...)`) but never called anywhere in the file — `season`
  is set once at mount and never changes, so the `useEffect` that depends on it (the
  interval-fetch effect) can never re-fire after mount either. Preserved faithfully from the
  original `.jsx` during the batch-1 conversion (not a new behavior, just more visible now that
  the file is typed); not fixed here.

## `PaymentsList`/`DuePaymentsList` cap at 20 visible rows, no way to see more

Both (`frontend/components/userPayments/{PaymentsList,DuePaymentsList}.jsx`, migrated to
`TanStackGrid` in item 13 batch 4c) pass `showPagination={false}` with no page-size override, so
only the table's default first page (20 rows) is ever reachable — there's no pager to reach row 21+.
Verified exact parity with the pre-migration `react-table` v6 behavior (both rendered 20 of a
25-row test set identically before and after), so not a regression from that migration — but worth
tracking now that the 20-row default lives inside the shared `TanStackGrid` component rather than
being an obvious per-table choice a future reader would notice. Fix, if a payer's payment history
ever needs to show more: either pass `pageSizeOptions`/re-enable pagination, or move these two
tables to real server-side pagination (flagged, not built, in PR #128).

## `LegacyColumn` accessors must not close over mutable component state

TanStack caches each row's `accessor` result in `row._valuesCache`, keyed only on the `data` array's
*reference* — not on any other component state. A column whose `accessor` reads mutable state (e.g.
`accessor: (d) => this.state.selected.includes(d.id)`) will show a stale value until something else
happens to change `data`'s own reference; a `setState` that only touches the state the accessor
reads (not `data`) does not invalidate the cache. This bit three real columns during item 13 batch
4d part 1 (`UserList.jsx`, `courses/LessonList.jsx`, `generalPayments/PaymentScheduleList.jsx` — a
selection checkbox stayed visually unchecked after being clicked, since only the selection state,
not `data`, changed) and was fixed by having their `Cell` read straight from `original` instead of
the cached `value`. 8 other accessor-only columns (no custom `Cell`, so they still render via
TanStack's own default path, which does use the cache) exist across `generalPayments/
{DuePaymentList,PaymentList,SubPaymentList}.jsx`, `courses/LessonList.jsx`, and `userPayments/
{PaymentsList,DuePaymentsList}.jsx` — all currently read only `this.props.*`/a closured `t`, never
mutable state, so none is a live bug today. Keep this invariant in mind before adding a new
`LegacyColumn` accessor that reads component state: either avoid it, or give that column its own
`Cell` reading `original` directly instead of relying on the cached accessor result.

## `courses/LessonList.jsx`'s "season" filter calls `setState` during render — React console warning

`LessonList.jsx`'s season-column `Filter` (`Filter: ({filter, onChange}) => {...}`, the last column
before "action") does, in its render body, unconditionally on the render where `currentAppsSeason`
is set but `filterApplied` isn't yet:
```js
if (currentAppsSeason && !filterApplied) {
    onChange(currentAppsSeason?.id || "");
    this.setState({ filterApplied: true });
}
```
Both `onChange` (which itself triggers a `TanStackGrid` column-filter state update) and
`this.setState` are called synchronously from inside a render function, not an event handler or
effect — React's real, correct response is the console warning "Cannot update during an existing
state transition (such as within `render`). Render methods should be a pure function of props and
state," observed repeatedly in this browser session's console history at `Filter → th → tr → thead
→ table → div → TanStackGrid → ... → LessonList`. Confirmed pre-existing on `develop`, unrelated to
any TanStack migration batch — `LessonList.jsx` predates and is untouched by later batches (verified
via `git diff develop..<later-batch-branch> --stat` showing no changes to this file). Not
investigated further (root cause of the warning is clear from reading the code above; whether it
causes any *user-visible* symptom beyond the console warning, e.g. a double-render or a filter that
applies late, hasn't been checked). Fix: move the `onChange`/`setState` pair into a
`componentDidUpdate` (this is a class component), keyed off whatever makes `currentAppsSeason`
become available, instead of the render body.

## `ActivityRefBasics.jsx`/`EditFormule.jsx` rebuild `dataService`/`columns` on every render

Both build a fresh `dataService`/`columns` object in `render()`, inside a shared `react-final-form`
`Form` that re-renders on every field interaction across the whole multi-tab form — so `TanStackGrid`
recomputes its column defs far more often than the data actually changes. Flagged during the
`react-table` → TanStack migration (PR #123) as a real but non-blocking inefficiency, not a
correctness bug (downgraded from an earlier, incorrect diagnosis that this churn caused a real
`getCoreRowModel()` caching bug — that bug's actual cause, traced later, was two data services
mutating a shared array in place; fixed at the source in batch 3). Fix, if ever worth it: memoize
`columns`/`dataService` on whatever they actually depend on instead of rebuilding them inline.

## `availabilityRef.current.componentDidMount()` reads stale props under automatic batching

Two call sites — `frontend/components/activityApplications/TimePreferencesStep.jsx:36` and
`frontend/components/parameters/Plannings/SchoolAvailabilities.tsx:62-64` (converted to `.tsx`,
behavior unchanged) — call
`this.setState`/a parent state update immediately followed by
`availabilityRef.current.componentDidMount()` on the child `AvailabilityManager`, relying on
`componentDidMount()` re-reading `this.props.intervals` to sync it into `AvailabilityManager`'s own
`state.list` (its *only* path from props to state — no `componentDidUpdate`, no
`getDerivedStateFromProps`). Under React 18's automatic batching, the parent's `setState` hasn't
committed yet when the imperative `componentDidMount()` call runs, so it reads the still-empty
`props.intervals` — the freshly-fetched default availabilities never render, even though they're
correctly in the parent's state moments later. Reproduced directly: DOM never mentions the fetched
interval, on both call sites, regardless of the `withRef: true` fix already applied at
`AvailabilityManager.jsx:334` (that fix made the ref resolve to a real instance instead of `null`,
which stopped a console warning and a swallowed `TypeError`/silently-shown error alert on
`SchoolAvailabilities.jsx`, but doesn't touch this deeper timing issue). Still reproduces
identically under React 19 — re-verified during the 18→19 bump's smoke pass, clicking "Créer la
disponibilité" on `/parameters/planning_parameters` still silently no-ops with no console error.
Fix: replace the imperative
`componentDidMount()` call with a real `componentDidUpdate(prevProps)` on `AvailabilityManager` that
syncs `state.list` whenever `props.intervals` actually changes, and drop the manual call entirely (at
both sites).

`SchoolAvailabilities.tsx`'s `availabilityRef` is typed `useRef<any>(null)` rather than something
real, since `AvailabilityManager.jsx` (what it refs) is still untyped JS wrapped in
`withTranslation(..., { withRef: true })` — no real type to point the ref at without migrating that
file too, which is out of scope for the conversion that introduced this comment. Real fix: migrate
`AvailabilityManager.jsx` to TypeScript.

## `react-toastify` 11 bump: minor visual drift, consciously accepted (not a bug)

`chore/bump-react-toastify` (4.5.2 -> 11.1.0) restores the pre-bump *colors*
(`theme="colored"`) and click-to-dismiss behavior (`closeOnClick`) via explicit props on
`Toaster.jsx`'s `<ToastContainer>`, and fixes the real layout regressions the version jump
introduced (bottom-center toasts rendering off-screen; text no longer centered — both in
`frontend/packs/application.scss`). What's deliberately left as-is: v11's toast box has a
larger `border-radius` (6px vs 1px), a different `box-shadow`, no longer clips overflow, and
the progress bar / close button markup changed shape (SVG icon vs a bold `✖` glyph). None of
this is functionally broken, just a minor "close but not pixel-identical" look versus the
pre-bump toasts. Not tracked for a fix.

## `propTypes` declarations are dead weight under React 19

React 19 removed `propTypes` validation entirely — declarations are now ignored rather than
erroring, so nothing breaks, but ~20 of them across `frontend/` (e.g.
`WrappedPayerPaymentTerms.jsx`, `PayerPaymentTerms.jsx`, `RemoveComponent.jsx`,
`editParameters/TeachersParameters.tsx`, `editParameters/DragAndDrop.tsx`) no longer do anything.
Not a bug — logged so nobody assumes those declarations are still validating anything. A
grep-for-removed-patterns audit does not surface this, because under 19 `propTypes` is an ignore,
not an error. Fix, when worth it: drop the declarations, or convert the components to TypeScript.
Note this will NOT remove `prop-types` from the bundle — `react-dropzone`, `react-modal`,
`react-select`, `react-switch` and `react-transition-group` all hard-depend on it, so the package
stays regardless of what the app itself declares.

Batch 1 (smallest 6, per `docs/Jsx-To-Tsx-Migration-Playbook.md`) converted: `common/ValidationErrorList.jsx`, `parameters/Plannings/TeacherAvailabilities.jsx`,
`userForm/ConsentDocItem.jsx`, `parameters/Plannings/SchoolAvailabilities.jsx`,
`parameters/BaseParameters.jsx`, `utils/ui/tabs.jsx` — now `.tsx`, `propTypes` dropped. Converting
`BaseParameters` (the only class in the batch) to a function component also forced
`parameters/{Community,Payments,Practice,Evaluations}/*Parameters.jsx` off `class X extends
BaseParameters` (JS can't extend a function) onto the same props-based pattern
`PlanningsParameters`/`ActivitiesParameters` already used. Remaining batches still pending.

Two intentional, user-visible restyles shipped as part of that conversion, not oversights:
`ConsentDocItem.tsx`'s checkbox (`Field`+`AlertCheckbox`) and yes/no (`AlertYesNoRadio`) cases were
both missing `alertType="info"` (every destructured use of `alertType` renders an
`alert-${alertType}` class; these rendered a bare `alert-undefined`) — found while typing the
conversion, since TypeScript inferred the untyped `AlertYesNoRadio`'s destructured params as
required. Fixed both to `alertType="info"`, matching `GDPR.jsx`/`NewsLetter.jsx`/`ImageRight.jsx`.
The same gap existed at a 4th call site, `userForm/CreateOrganizationModal.jsx`'s
`Field`+`AlertCheckbox` for `openInputTVA` — fixed alongside it. All 3 fixes turn an unstyled (or
bare-undefined-class) box into a blue Bootstrap `alert-info` box. `ConsentDocItem.test.tsx` now
asserts the `alert-info` class directly as a regression guard.

Batch 2 converted: `activityApplications/PersonChoice.jsx`, `PlanningListRooms.jsx`,
`PlanningListTeachers.jsx`, `RemoveComponent.jsx`, `planning/SelectLocation.jsx`,
`personalInfos/Roles.jsx` — now `.tsx`, `propTypes` dropped. `PlanningListRooms`/
`PlanningListTeachers` (`withTranslation("planning")`-wrapped classes) and `SelectLocation`
(constructor + `componentDidUpdate`) all moved to hooks; `SelectLocation`'s `options` state is a
`useState` lazy initializer (a function, not a call result, so `formatOptions` itself only runs
once too — React only invokes it on the very first render, matching the class's constructor-only
computation; a plain `useRef(formatOptions(...))` would still re-run `formatOptions` as wasted
work on every render, and a `useMemo` would incorrectly recompute the kept value on later prop
changes), and its `componentDidUpdate(prevProps)` reset became a `useEffect` with an explicit
prev-value ref check so it doesn't also fire on mount (a plain `useEffect([dep])` would, unlike
`componentDidUpdate`).

Found no real call site anywhere in `app/views` or `frontend/` for `PersonChoice.jsx`,
`PlanningListRooms.jsx`, or `planning/SelectLocation.jsx` (confirmed by grep across both trees,
beyond their own files/tests) — may be reachable only through a plugin's own (gem-side, not in
this repo) ERB views, which this repo's grep can't see. Converted and typed as given rather than
deleted, per this repo's "don't delete on 500 / looks dead" convention.

Dead code dropped during the batch 2 rewrite (confirmed by grep, not assumed):
`PlanningListRooms.jsx`'s unused `moment`/`PropTypes` imports; `PlanningListTeachers.jsx`'s
`durationToString` function (defined, never called -- it used `moment.isDuration`, nothing to do
with lodash) and, separately and unrelatedly, that same file's unused `lodash` import (zero `_.`
usage anywhere in the old file); `SelectLocation.jsx`'s `activities` prop (declared in
`propTypes`, never read); `personalInfos/Roles.jsx`'s `adhesions` field of the `user` prop's old
`PropTypes.shape` (declared, never read). Also fixed two propTypes/usage mismatches predating this
conversion: `RemoveComponent.jsx` used `additionalMessage` without ever declaring it in
`propTypes`; `SelectLocation.jsx` used `locations`/`mode` the same way — both
now in their respective `.tsx` prop interfaces.

**Real behavior fix, not a mechanical rewrite:** `SelectLocation.jsx`'s `formatOptions` had
`return acc.splice();` (zero arguments) on the "this room has no location" branch of its
`reduce`. Per spec, a 0-argument `splice()` call deletes nothing and returns `[]` — so that line
actually reset the whole accumulator to empty every time a location-less room was hit
mid-iteration, silently discarding every option already built up before it (only "fixed" by
coincidence when a later room happened to rebuild the same options afterward — order-dependent,
and genuinely broken whenever a location-less room came last). Found and fixed during this
conversion: changed to `acc.splice(0)` (one argument — `start`), which deletes *every* item in
`acc` and returns them, i.e. returns a copy of what `acc` held, correctly preserving it while
skipping the current element. `SelectLocation.test.tsx`'s room fixture deliberately keeps its
location-less room last, so this is covered by a real regression test (reverting to the original
`acc.splice()` makes `formatOptions`'s dedup test return `[]` instead of the expected two
options).

Batch 3 converted: `common/SelectMultiple.jsx`, `PayerPaymentTerms.jsx`,
`planning/CreateActivityModal.jsx`, `planning/RawPlanning.jsx`, `planning/SelectActivity.jsx`,
`planning/SimplePlanning.jsx`, `planning/TimeInterval.jsx`, `WrappedPayerPaymentTerms.jsx` — now
`.tsx`, `propTypes` dropped. All 6 class components moved to hooks; `PayerPaymentTerms.jsx` was
already functional and only needed typing. `SelectActivity`'s `componentDidUpdate` (resetting
`values` when `lastReinitialize` changes) became a `useEffect` with the same explicit
prev-value-ref guard as batch 2's `SelectLocation`, so it doesn't also fire on mount.
`SimplePlanning`'s `SimpleEvaluation` was a `React.PureComponent` -- wrapped in `React.memo`
instead of a plain function to keep its shallow-prop-comparison skip-render behavior. That only
actually works because the 2 callback props `memo` compares (`toggleModal`, `setQuestionnaire`)
are `useCallback`s with an empty dependency array in `SimplePlanning`, not plain function
declarations (caught by code-reviewer: an earlier version of this conversion used plain functions,
which `memo` would have seen as new on every `SimplePlanning` render, silently making the `memo`
wrapper inert).

**`WrappedPayerPaymentTerms` needed a `forwardRef`, not a plain function, and so did a fix to
`utils/ui/StepZilla.tsx`.** The wizard (`Wizard.jsx`) renders payment-terms as a StepZilla step
and calls its `isValidated()` to gate the "Next" button; StepZilla only attaches a ref to a step
whose component type satisfies `componentType.prototype instanceof React.Component` (an ES6-class
check). Converting `WrappedPayerPaymentTerms` to a plain function component would have made that
check silently false, StepZilla would stop attaching a ref at all, and `isValidated()` would never
fire again -- removing the payment-step validation gate from production with no error, just a
step that always "passes" via StepZilla's own no-ref-means-always-valid fallback. Fixed two ways
together: `WrappedPayerPaymentTerms` is now `forwardRef(...)` + `useImperativeHandle` exposing
`isValidated()`, and `StepZilla.tsx`'s ref-attachment check (`stepAcceptsRef`) was widened to also
recognize a `forwardRef`-wrapped component (checking its `$$typeof` against
`Symbol.for("react.forward_ref")`, not the `react-is` package, since that's only a transitive,
unpinned dependency here). Covered by a new regression test in `StepZilla.test.jsx`
(`ForwardRefValidatingStep`) mirroring the existing class-based `ValidatingStep` test, direct
ref-based `isValidated()` tests in `WrappedPayerPaymentTerms.test.tsx`, and (closing a coverage
gap code-reviewer flagged -- the first two prove each half in isolation, nothing tied them
together) an end-to-end `WrappedPayerPaymentTerms.test.tsx` test mounting it as a real `StepZilla`
step and driving the actual "Next" button, the same path `Wizard.jsx` uses.

**Real bug found, not a mechanical rewrite: `SelectMultiple.jsx`'s constructor never actually
deduplicated pre-selected features, which broke `allowSelectAll` on an existing room's
activities.** `_.remove(this.state.features, this.state.selectedFeatures)` was meant to drop every
already-selected feature from the list of choices still offered (the same intent as the
single-item `_.remove(this.state.features, newFeature)` a few lines down in `handleChange`, which
does work). But lodash's iteratee shorthand treats an *array* predicate as
`_.matchesProperty(value[0], value[1])`, not "remove every element present in this array" --
verified empirically (`_.remove(copy, selectedArray)` left `copy` completely unchanged).

This is harmless for a plain multi-select with pre-selected features and no `allowSelectAll`
(`userForm/Payers.jsx`, `activityRef/ActivityRefTeachers.jsx` both pass `isMulti` with no
`allowSelectAll` -- react-select's own option matching already keeps a selected feature from
being re-selectable from the menu regardless of whether this component's own `availableFeatures`
list still (wrongly) contains it, so nothing was actually duplicated or re-selectable there,
before or after this fix -- correcting an earlier, incorrect version of this note that named
these two as the affected callers). The real, live-reachable bug is
`app/views/rooms/edit.html.erb:47`'s `react_component("common/SelectMultiple", { isMulti: true,
allowSelectAll: true, features: @room.activity_refs.collect(&:id), ... })`: `selectAll()` builds
`[...selectedFeatures, ...availableFeatures]`, and since the already-selected activity refs were
never actually removed from `availableFeatures`, clicking "select all" on an existing room
produced duplicate chips and duplicate ids in the hidden `room[activity_refs]` form input. Fixed
to a plain `.filter(...)` exclusion, gated on `isMulti` (see the single-select note below).
`SelectMultiple.test.tsx` covers both: "every pre-selected feature (not just the first) is
dropped" is a regression guard for the dedup fix itself (reverting to the original lodash call
makes it fail), and "selectAll with pre-selected features produces no duplicate ids" exercises the
`allowSelectAll` path directly.

**Single-select must keep its pre-selected option visible, unlike multi-select.** The dedup fix
above was initially applied unconditionally (multi- and single-select alike), which broke
`app/views/rooms/edit.html.erb:13`/`rooms/new.html.erb:22`'s single-select location dropdown
(`isMulti: false`, `features: [@location_id]`, no `isClearable`): the pre-selected location was
excluded from `availableFeatures` on mount, so it vanished from the menu, and with no
`isClearable` there was no way back to it once another location was picked (confirmed by
code-reviewer, caught before merge). react-select's own `shouldHideSelectedOptions` default is
`isMulti` -- i.e. single-select is supposed to keep the selected option visible/reachable in the
list -- so the exclusion is now gated on `isMulti`, matching the symmetric `isMulti`-gated removal
already present in `handleChange`'s "select-option" branch. Covered by a
`SelectMultiple.test.tsx` test asserting the pre-selected option stays visible/selectable in
single-select mode.

Dead code dropped during the batch 3 rewrite (confirmed by grep, not assumed):
`SelectMultiple.jsx`'s unused `Field`/`AlertCheckbox`/`Input` imports (none of the 3 were ever
referenced in the render); `CreateActivityModal.jsx`'s `onSave` prop (declared `.isRequired` in
the old `propTypes`, never read anywhere in the file -- `Planning.jsx`'s real `onSave` pass-through
is simply ignored, same as before, and out of scope to touch here); a dead `this.state.payers`
write in `WrappedPayerPaymentTerms.jsx`'s old `handleChangePayers` (set, never read -- the real
state update happens one level up, in `PayerPaymentTerms`). Also fixed propTypes/usage mismatches
predating this conversion, all in the "declared but never used, or used but never declared"
direction: `RawPlanning.jsx` read `evaluations_level_refs` without ever declaring it;
`SelectActivity.jsx` read `rooms`/`mode`/`locations` the same way; `SimplePlanning.jsx` read
`day`/`selectedPlanning`/`currentPlanning`/`listTeachers`/`selectedName` the same way (its old
`propTypes` only covered `data`/`seasons`) -- all now in their respective `.tsx` prop interfaces.
Tightened `CreateActivityModal`'s `handleCloseAndOpenDetails` and `SelectActivity`'s `onChange`
from optional (no `.isRequired`) to required -- both are called unconditionally with no guard from
multiple call sites, so every real caller already supplies them.

**Real behavior fix in `SelectActivity.formatOptions`, not a mechanical rewrite (caught by
code-reviewer -- this one shipped without the writeup the `_.remove`/`SelectMultiple` fix got,
inconsistently with this batch's own stated policy).** Same bug pattern as batch 2's
`SelectLocation`: the original was `return acc.splice();` (zero-arg `splice()`) on the "this
room/teacher has no activity refs" branch of the `reduce` -- per spec, a 0-arg `splice()` call
deletes nothing and returns `[]`, so it reset the whole accumulator to empty every time an
element with no activity refs was hit mid-iteration, discarding every option already built up
before it (only "fixed" by coincidence when a later element happened to rebuild the same options
afterward). Changed to `return acc` (keep the accumulator, this element contributes nothing).
`SelectActivity.test.tsx`'s "a room with no activity refs at all does not wipe out options
already built from earlier rooms" test deliberately keeps that room last, so this is covered by a
real regression test (reverting to `acc.splice()` makes it return `[]` instead of the 2 expected
options).

**Inconsistent optional-chaining policy, caught by code-reviewer.** `RawPlanning.tsx`'s
`OptionItems` carries an explicit comment that this file's policy is "no new optional-chaining
guards added... rather than silently swallowing a shape the original code never defended against
either" -- but 3 spots initially violated that same policy within this batch:
`RawPlanning.tsx`'s `evaluationsLevelRefs.find(...)` result and `activity.room` (both originally
accessed with no guard, `.find(...).label`/`activity.room.label`), and `SimplePlanning.tsx`'s
`timeInterval.students.active`/`.options` (also originally unguarded). All 3 had picked up a `?.`
+ fallback during typing, turning a would-be crash into a silently-wrong empty/undefined value --
a bigger behavioral risk than keeping the original's "trust the data" crash for a shape that
should be structurally guaranteed. Reverted to `!` non-null assertions at all 3, matching the
stated policy and the original's actual behavior.
`RawPlanning.test.tsx`'s fixture had to be fixed alongside this: it omitted
`evaluation_level_ref_id` entirely instead of setting it to `null` (the shape the real payload
always sends, per the entry above), which the removed `?.` had been silently papering over --
the fixture now matches the real payload shape, and a new test exercises the
`evaluation_level_ref_id` branch set (not just the `null`/fallback one).

**`SimplePlanning.tsx`'s `SimpleTimeInterval` repeated the batch-2 ad-hoc-type mistake, caught by
code-reviewer.** It redeclared `id`/`start`/`end`/`kind`/`is_validated` instead of `extends
TimeInterval` (which `RawPlanning.tsx`, converted in the same batch, does correctly), and inlined
3 shapes that are already real entities in `entities.ts`: `activity_ref` -> `ActivityRef`, `room`
-> `Room`, `evaluation_level_ref` -> `EvaluationLevelRef`. Fixed to match the pattern the rest of
this batch already established. `SimplePlanning.test.tsx`'s fixtures needed the extra fields
`ActivityRef`/`Room` actually require (`is_work_group`, `activity_ref_kind_id`,
`activity_ref_kind`, `room.id`) that the old ad-hoc shapes didn't.

**Untyped-JS-boundary fixes needed to make `PayerPaymentTerms.tsx` compile, not behavior
changes:** `ToggleButtonGroup.jsx` (still untyped JS) had a JSDoc comment with one `@param` tag
per destructured prop field; TypeScript's allowJs JSDoc inference matched those tags positionally
against the function's one real (destructured-object) parameter and inferred it as plain `number`
(the first tag's type) instead of an object -- harmless until a `.tsx` file actually imported it
(this conversion was the first). Replaced the misleading per-field JSDoc with a plain comment, and
changed `maxSelected`'s "default via `||` in the function body" into a real destructuring default
(`{maxSelected = 1, ...}`) so TypeScript infers it as optional -- behaviorally identical except for
the already-unreachable `maxSelected === 0` edge case (no real caller passes `0`, confirmed by
grep). Also dropped `PayerPaymentTerms.tsx`'s `multiSelect={false}` prop to `ToggleButtonGroup`,
which never reads a `multiSelect` field at all (dead at the call site, same as before this batch).

`entities.ts` gained `User.identification_number` (real `users` table column + a real
strong-params/serialized field, `db/schema.rb`/`users_controller.rb`) and `Activity.room` (real
`has_one :room` association, `app/serializers/activity_serializer.rb`) -- both read by components
in this batch but missing from the shared entity before.

Correction to an earlier version of this entry (caught by code-reviewer before merge):
`RawPlanning.tsx`'s `activity.evaluation_level_ref_id` check was first flagged here as likely
dead code, reasoning from `ActivitySerializer`'s attribute list (which really doesn't include it).
That reasoning doesn't apply to this call site: `RawPlanning` isn't fed by `ActivitySerializer` at
all, it's fed by `PlanningController#get_intervals`'s `as_json(include: {...})` call
(`app/controllers/planning_controller.rb:258-292`), which -- with no `only`/`except` restricting
it -- emits every real `activities` column, `evaluation_level_ref_id` included (`null` when unset,
the real id otherwise). So the `!== null` check is genuinely reachable and correct as written, not
dead code -- the original flag was also self-refuting on its own terms (if the field really were
always `undefined`, the pre-conversion unguarded `.find(...).label` call would have crashed on
every validated activity, which it doesn't). Not added to `entities.ts`'s shared `Activity`
interface regardless, since that field genuinely isn't part of every `Activity` payload (just this
one raw-`as_json` endpoint) -- kept as a local cast in `RawPlanning.tsx` instead.

No real call site was found anywhere in `app/views` or `frontend/` for `planning/TimeInterval.jsx`
(confirmed by grep across both trees, beyond its own new test file) -- same situation as a few
batch-2 components. Converted and tested as given rather than deleted, per this repo's "don't
delete on 500 / looks dead" convention.

## `UserForm.jsx` never pre-fills a user's existing consent-doc answers

Found while converting `ConsentDocItem.jsx` to TypeScript (jsx-to-tsx batch 1) and tracing why its
`defaultValue` prop was unused (it is -- dropped from `ConsentDocItemProps`, see the batch-1 note
above). `UserForm.jsx:405-419` still computes a real `defaultValue` per doc (a `.find()` over
`initialValues.consent_document_users` for that doc's `has_consented`) and passes it to
`ConsentDocItem`, but `ConsentDocItem` has never read it (confirmed back to before this
conversion) and nothing else makes it reach the `Field`s it renders either:
`UserForm.jsx`'s `formattedInitialValues` (`:283-293`, what actually feeds the enclosing
`<Form initialValues={...}>`) only ever formats `YES_NO_FIELDS`
(`checked_image_right`/`checked_newsletter`) -- it never builds the
`consent_docs.id_<N>.agreement` key that would need to exist for react-final-form to pre-fill
`ConsentDocItem`'s `Field name={consent_docs[id_${docItem.id}].agreement}`. Net effect: a user
re-opening their profile always sees every consent checkbox/radio unanswered, even if they
already answered it. Not fixed here -- `UserForm.jsx` is out of scope for this batch. Whoever
converts it should either wire up the real pre-fill (build that `consent_docs.id_<N>.agreement`
key into `formattedInitialValues` from `consent_document_users`) or, if the pre-fill is
intentionally not wanted, drop the now-pointless `defaultValue` prop pass-through at the call site
instead of reintroducing it.

## React 19 reports uncaught render errors more quietly than React 18

React 19 routes uncaught render errors to `window.reportError` and drops both the `"Warning: "`
prefix and the companion `"The above error occurred in the <X> component ... Consider adding an
error boundary"` message with its component stack. Measured on the `/plannings/all_rooms` crash
above: 4 console entries under React 18 (two of them duplicated by `invokeGuardedCallback`), 1
under React 19. The error is still printed, so a developer still sees it — but there is less to go
on, and this app has no error boundaries, no `window.onerror` and no Sentry, so nothing captures
the component stack that 18 used to print. Relevant when triaging a blank React island: check the
console carefully rather than expecting the old two-part output.

## `Planning.jsx`'s remove-student handlers update `selectedIntervals` but not `intervalStore`

`handleRemoveStudent`/`handleRemoveOptionalStudent` (`frontend/components/planning/Planning.jsx`)
splice the freshly-fetched interval into `this.state.selectedIntervals` by index, in place, but
never rebuild `this.state.intervalStore` (the separate id-keyed object `ActivityDetailsModal`'s
`interval` prop actually reads from, via `this.state.intervalStore[this.state.intervalDetail]`,
see `:1671`). Re-opening the detail modal for that same interval right after a remove-student
action would show the stale cached version from `intervalStore`, not the just-fetched one.
Pre-existing in this exact shape even in the original (broken) code this replaced -- not a new
regression, just not fixed now (the established-safer pattern already used by `handleOpenDetail`
is to rebuild both via `this.setState({...this.getIntervals(newIntervals), ...})` instead of
mutating `selectedIntervals` alone). Fix: switch both handlers to the same `getIntervals(...)`
pattern.

## `ActivityDetailsModal.jsx`'s `editionMode` is dead code, not a live one-way switch

`handleEditionMode()` (`frontend/components/planning/ActivityDetailsModal.jsx:650`), the only
method that ever sets `this.state.editionMode = true`, has zero call sites anywhere in the file
or the rest of the repo -- not even commented-out JSX. The earlier framing of this as a one-way
switch worth a product call was wrong: nothing can enter edit mode today, so there's no UX gap to
resolve. Logged for awareness in case a future change wires up a real entry point; not deleted per
this repo's don't-delete-on-looks-dead convention.

## `Season.next` crashes with `NoMethodError` when no season is flagged `is_current`

`Season.next` (`app/models/season.rb:120-124`) is `includes(:holidays).where(id: current.next_season_id).first`
-- `current` has no nil guard, so with zero `Season` rows flagged `is_current`, `Season.current` is
`nil` and `.next_season_id` raises. `ApplicationController#verify_season`'s bootstrap
(`append_before_action :verify_season, only: [:index]`) doesn't cover this: it only redirects to
season setup when there are zero `Season` rows total, not when rows exist but none is current, and
`PlanningController` has no `index` action for the hook to run on anyway.

Pre-existing, not introduced by the `show_all_rooms` season-prop fix (PR fixing
`/plannings/all_rooms`'s missing `season:` prop) -- that fix mirrored `show_for_room`'s
`Season.next.as_json(...)` line exactly, which already had this same crash, so it now also
reaches `show_all_rooms`. At least 19 other call sites share the same unguarded pattern (`grep -rn
"Season\.next" app/ lib/`), including `PlanningController#show`/`#show_generic`/`#show_for_room`/
`#show_availabilities_for_date`, `ActivitiesApplicationsController`, `ActivityController`,
`UsersController`, `EvaluationAppointmentsController`. Also note: even once the backend is
guarded, `frontend/components/planning/Planning.jsx:83`'s `this.props.season.holidays.length` in
the constructor still assumes a non-null `season` prop -- a full fix needs both a nil-safe
`Season.next` (or call-site guards) and a frontend guard for the "no current season" case. Fix,
narrowly: `next_id = current&.next_season_id` and have callers handle a possible `nil` result;
broadly: decide whether "no current season" should even be reachable in a properly bootstrapped
instance, or whether every caller needs defensive handling.
