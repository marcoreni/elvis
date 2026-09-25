# Modernization roadmap (post-i18n)

Scoped 2026-09-13, after the i18n Phase 07 rollout was confirmed complete and
`docs/KnownIssues.md` was trimmed to its current ~11 sections. This tracks the next batch of
work so it survives a context reset without having to be re-discussed. Update the status line
of each item as it moves; while an item is still active, keep whatever detail is actually useful
for picking the work back up. Once an item is fully done, trim it to a short summary (what
shipped, in a few lines) plus its commit/PR reference — the commit message/PR description is the
full record, not this file (trimmed 2026-09-19; items had accumulated 50+ line investigation
narratives whose lasting value was already covered by git history).

## 1. CI workflow on develop/main — done, see `.github/workflows/ci.yml`

CI's `rspec` job runs with `Chewy.strategy(:bypass)`, no Elasticsearch service — removes a class of
infra flakiness for free. Dev/prod ES bumped 7.16.3 → 7.17.28 separately (they search for real).
Also fixed along the way: a broken production Rspack build, stripped locale YAML comments, and
`RequestData`'s type. See item 5 for a related flake.

## 2. Orphaned-code tracking file — done, see `docs/OrphanedCode.md`

Created; deleted 17 confirmed-dead files/routes/actions found via `docs/KnownIssues.md`'s old
"Dead/unrouted code" audit. 2 genuinely-open items became their own smaller `KnownIssues.md`
entries. README's old "Removed dead code" section now points here instead of duplicating it.

## 3. Move hardcoded `Europe/Paris` timezone into configuration — done, `feat/school-timezone-config`

Shipped as env/boot-time config (`config.time_zone = ENV.fetch("SCHOOL_TIMEZONE", "Paris")`,
matching `config.i18n.default_locale`'s category), not a DB `Parameter` row. New
`Elvis::SchoolTimezone.iana_name` resolves the IANA name for the frontend (`data-timezone` on
`<html>`, read via `frontend/tools/timezone.ts`'s `SCHOOL_TIMEZONE`), replacing 2 hardcoded
`PARIS_DATE_FORMAT_OPTIONS` constants. `KnownIssues.md`'s matching entry removed.

## 4. i18n PRs #7–#10 — done, see `fix/i18n-pr7-10-review-findings`

Fresh-eyes review found and fixed 2 real bugs: `UserList.jsx`'s `total` rendered a raw i18n key
until the debounced fetch resolved (missing `total: 0` initial state), and
`StudentEvaluationsStats.tsx` was the one react-table instance not passing the shared
`common:reactTable.*` props, so its pagination stayed English-only. Regression test added for the
second. `KnownIssues.md` entry removed.

## 5. `DeviseMailer`/`ApplicationController` order-dependent flake — resolved, see `fix/locale-flake-async-queue-adapter`

Root cause: no `config.active_job.queue_adapter` override in test, so Rails' `:async` default ran
real background threads racing the main thread on I18n's shared translation lookup, silently
falling back `en → fr` on a miss. Fixed with `queue_adapter = :test`. Confirmed via 19 consecutive
clean full-suite runs (previously reproduced within 1-3).

## 6. Replace `tui-calendar` — done, `feat/replace-tui-calendar` (PR #104, Step A: `chore/fullcalendar-v6-bump`)

Replaced with FullCalendar v6 (`@fullcalendar/{core,react,interaction,resource-timeline,resource}`)
via `planning/Calendar.tsx`, a functional adapter that reconstructs the same tui-calendar-shaped
"schedule" object from FullCalendar's `extendedProps` so `Planning.jsx` and its modals needed almost
no changes. Preserved the fork's only 2 load-bearing customizations (15-minute snap, raw domain
fields grafted onto events) via FullCalendar's native `snapDuration`/`extendedProps`. Two
code-reviewer passes caught several real bugs before merge (icon-font CSS, a private `._date`
tui-calendar internal, dropped per-event colors, stringified-id equality breakage, no locale) — all
fixed, see PR #104. Added 10 interaction tests (none existed before). Bundled with the item's own
recommendation: functional + TS (`useTranslation`, real types, lodash dropped) — see
`docs/Jsx-To-Tsx-Migration-Playbook.md` (PR #107) for the conventions this established. Note for any
future "true side-by-side plannings" feature: `@fullcalendar/resource-timeline` is a premium plugin
(paid, CC BY-NC-ND, or free under GPLv3 for open source) — not needed for today's feature parity.

## 7. Migrate `sweetalert2` off the legacy API — done, `chore/sweetalert2-v11-bump` (PR #99, merged)

`7.33.1` (final 7.x) → `11.26.25` across ~107 independent call sites (no shared wrapper existed).
Truly breaking surface — bare `swal(...)` calls (crash in v11, no callable default export),
`type:`→`icon:`, `on*`→`did*`/`will*` callbacks — forced into one atomic PR with the version bump
via a small AST-driven codemod. `.value` turned out non-breaking (v11 keeps it), so that
modernization was deferred safely. Code review caught a real codemod miss (`ActivitiesApplicationsList.jsx`
had two separate `sweetalert2` imports, only one got rewritten) plus 3 dropped `*Class` keys — both
fixed before merge. `.value`→`.isConfirmed` cleanup shipped separately (2026-09-15, 4 domain-batched
PRs), closing out this item entirely.

## 8. Elasticsearch removed entirely — done, `chore/remove-elasticsearch`

Only 13 files touched Chewy app-wide; the one reachable consumer (`#index`/omnisearch) was
rewritten onto Postgres `ILIKE` + `unaccent` (`Search::OmnisearchService`), matching this repo's
existing `ci_ilike_find` convention rather than adding full-text-search infra. `#advanced_search*`
was unroutable dead code, deleted rather than ported. New `spec/requests/search_controller_spec.rb`
(no prior coverage existed). Verified: full `rspec`/`tsc`/`vitest`/`rubocop` all clean.

## 9. `run_chewy_callbacks` override — was a real live bug, now moot

Found and fixed a real per-thread `Chewy.strategy` propagation bug in
`application_record.rb#base_chewy_callbacks` (async reindex thread never inherited the test suite's
`:bypass` strategy, so specs silently attempted real ES connections in the background). Fully
superseded days later by item 8's complete Elasticsearch removal, which deleted this method
entirely — kept here only as a pointer in case the per-thread-strategy pattern resurfaces elsewhere;
see git history for the fix if ever needed.

## 10. Hardcoded `"fr"`/`"fr-FR"` locale in date/number formatting — done except `bill.html.erb`, `fix/locale-and-untranslated-strings`

Same category as item 3 (hardcoded constant that should follow a runtime setting) but for language:
module-level `Intl.DateTimeFormat("fr", ...)`/`Intl.NumberFormat("fr-FR", ...)` calls that never
re-evaluate on locale switch. Fixed in `EvaluationIntervalChoice.jsx` (moved into
`useMemo(..., [i18n.language])`), 3 payment-list class components (swapped to
`this.props.i18n.language`), `devise/registrations/new.html.erb` (dropped a stray
`I18n.with_locale("fr")`), and a 6th site found by a repo-wide sweep (`PaymentsSummary.jsx`, +
regression test). **Still deliberately deferred**: `app/views/payments/bill.html.erb` has the same
pattern but sits inside an entire never-i18n-extracted French template — fixing just the date would
make it worse (translated date inside all-French prose); needs its own extraction pass.

## 11. Hardcoded French UI strings outside the i18n rollout — done, `fix/locale-and-untranslated-strings`

Found while auditing item 7's sweetalert2 call sites — plain un-extracted French text, not a
locale-follows-setting bug like item 10. Fixed: `api.ts`'s app-wide fetch-error fallback (highest
traffic — every unhandled API error hit this; also fixed a "cod suivant" typo), `public/500.html`'s
copy-pasted 404 title, and a full i18n-extraction pass on the plugin-management UI (`Plugins.jsx`,
`PluginActivationModal.jsx` + 3 more, new `plugins` locale namespace) — which also surfaced and
fixed a pre-existing, unrelated logic bug (`isActivated` derived from the wrong value).
`BtnApiElement.jsx` turned out fully dead (zero importers) — deleted, logged in `docs/OrphanedCode.md`.

## 12. `react-stepzilla` vendored and rewritten — done, `feat/vendor-react-stepzilla`

Replaced the last exotic (git-pinned) frontend dependency with a local, typed, functional rewrite
(`frontend/components/utils/ui/StepZilla.tsx` — `useState`/`useRef`/`useEffect` instead of a class +
legacy string refs). Caught and fixed 2 real behavior regressions against upstream during the port
(a dropped `prevBtnOnLastStep` override, a miscomputed initial `validated` flag), both covered by
new tests. `react-stepzilla` fully removed from `package.json`/`yarn.lock`. `KnownIssues.md`'s
"Exotic dependencies" section (its last entry) removed.

## 13. `react-table` v6 → TanStack Table — batches 1-4d merged; `Activity.jsx` open for review (last file), then drop the package

`react-table@^6.8.0` (peer dep `react: ^16.x.x` — doesn't even officially claim React 17 support,
same pattern as `react-loader-spinner`, item in the "Frontend dependencies" KnownIssues entry) is 4
years old; the project renamed to `@tanstack/react-table` at v7. Evaluated 2026-09-16 against the
question of sequencing this relative to the React 17→18 bump (item 14).

**Decision: migrate to TanStack Table v8 *before* the React 18 bump, not after or bundled with it.**
The premise that "the latest react-table requires React ≥18" is only true of **v9** — checked
directly against npm, not assumed:
- `@tanstack/react-table@8.21.3` (latest stable v8, actively patched): `peerDependencies: { react:
  ">=16.8", "react-dom": ">=16.8" }` — works fine under this app's current React 17.
- `@tanstack/react-table@9.2.4` (latest overall): `peerDependencies: { react: ">=18" }` — this is
  the version that actually requires 18+.

So v8 is a fully-supported, independent target today; nothing about it needs to wait on item 14.
Doing it first (rather than after, or in the same push as, the React bump) keeps two large,
unrelated-risk migrations bisectable instead of one giant compound change — and removes react-table
entirely from the "does this survive React 18" unknown-list before that bump even starts, since v6
was already peer-dep-unverified past React 16 anyway.

**Scope, characterized (2026-09-16), not yet executed:**
- No official v6→v8 guide exists — TanStack's own migration doc
  (tanstack.com/table/v8/docs/guide/migrating) only covers v7→v8 ("a major rewrite of React Table
  v7 from the ground up in TypeScript"). v6's API (pass `columns`/`data`/feature-flag props like
  `manual`/`filterable`/`resizable`/`sortable` straight to a `<ReactTable>` component, no headless
  markup) is a different paradigm entirely from v8's hooks-based `useReactTable()` + explicit row
  models (`getCoreRowModel()`, `getPaginationRowModel()`, `getSortedRowModel()`,
  `getFilteredRowModel()`) + hand-built `<table>` markup. This is a real per-table rewrite, not a
  mechanical rename pass — `Cell:`/`accessor` become `cell:`/`accessorKey`/`accessorFn` with a
  `getValue()`-based access pattern, but the surrounding structure changes completely.
- 26 files import `react-table` directly. Two are shared wrappers: `frontend/components/common/
  baseDataTable/BaseDataTable.jsx` (functional) and `frontend/components/parameters/BaseDataTable.jsx`
  (class-based, its own extender set, still reads the i18n singleton directly per the existing
  KnownIssues.md caveat). **Correction (2026-09-16):** an earlier pass of this doc said the
  functional wrapper had "15 consumers, e.g. `BandsType`, `Materials`" — wrong, a grep on the
  literal string `BaseDataTable` conflated both wrappers' consumers (`parameters/Practice/
  BandsType.jsx` imports `../BaseDataTable`, i.e. the *class-based* one, not the functional one).
  Checked precisely by import specifier: the functional wrapper has only **3** real consumers
  (`ActivityRefBasics.jsx`, `EditFormule.jsx`, `PricingCategoriesEdit.jsx`); the class-based one has
  **12** (`BandsType`, `Materials`, `Groups`, `FlatRate`, `Features`, `Instruments` ×2 — activities/
  and parameters/Practice/, `MusicGenres`, `PaymentsStatus`, `PaymentsMethods`, `EvaluationLevels`,
  `ActivityRefKind`). Rewriting each wrapper's *internals* while preserving its external prop
  contract gives their consumers a free ride either way — this just changes which batch each
  consumer falls into. **Second correction (2026-09-19, found by a retroactive review of the
  merged batch-1 PR):** the "3 real consumers" count above is itself still wrong — there's a
  fourth, `parameters/Payments/Coupons.jsx`, which imports the functional wrapper with a
  single-quoted specifier (`from '../../common/baseDataTable/BaseDataTable'`), invisible to the
  double-quote-sensitive grep the first correction used. It happened to work unmodified (its
  column ids all match real `coupons` table columns), but that was luck, not something the batch-1
  verification actually checked.
- Real features to preserve, confirmed by grepping actual usage, not just `BaseDataTable.jsx`:
  server-side/manual pagination+sorting+filtering (v6's `manual` prop → v8's `manualPagination`/
  `manualSorting`/`manualFiltering` table options), per-column `sortable`/`filterable` toggles,
  custom `Cell` renderers, `resizable`. One feature has no v8 built-in equivalent: `SubComponent`
  (expandable rows), used in 6 files. **Correction (2026-09-19):** an earlier pass of this list said
  `parameters/BaseDataTable.jsx` was one of the 6 — wrong, checked by grepping the literal
  `SubComponent` prop (not just the coincidentally-named `subComponent` state key
  `parameters/BaseDataTable.jsx` carries but never wires up, confirmed dead/unused by grepping all
  12 real extenders — harmless to have left inert in batch 2). The actual 6th file is
  `generalPayments/PaymentList.jsx`, missed by the earlier pass. Correct list: `DuePaymentList`,
  `PaymentList`, `LessonList`, `Localisations`, `PackUtilization`, `Activity.jsx` — v8 needs
  `getExpandedRowModel()` plus a hand-rolled extra `<tr colSpan>`. `Activity.jsx` additionally has a
  custom `Expander` cell renderer + `expander: true` column config — the most complex table in the
  set, not proof-of-concept material.
- Batch large, not one table per PR (this repo's established convention for bulk mechanical/rewrite
  work). Order, each batch depending on the pattern proven by the previous one:
  1. **DONE (2026-09-16, `feat/tanstack-table-batch1-basedatatable`).** `common/baseDataTable/
     BaseDataTable.jsx` internals rewritten to v8 (`@tanstack/react-table@^8.21.3` added). Its
     external prop contract held exactly — all 3 real consumers needed **zero** changes (columns
     stay in the v6 shape; an internal `toTanStackColumn` adapter translates `Header`/`accessor`
     (string, dot-path, or function)/`Cell`/`sortable`/`filterable`/`width` to v8's column-def
     shape). `frontend/components/ReactTableFullScreen.jsx` was deliberately left untouched (still
     v6) rather than folded into this batch as originally sketched — it's shared by 4 other real
     tables outside this batch (`UserList`, `generalPayments/CheckList`, `DuePaymentList`,
     `PaymentList`), one of which (`DuePaymentList`) uses `SubComponent`; rewriting it now would
     have silently pulled those four into a "batch 1 proof of concept" and jumped the expander
     problem ahead of schedule. `common/BaseDataTable.jsx` now renders its own hand-rolled
     `<table>` + pagination footer + per-column filter inputs directly (headless v8 has no
     replacement black-box component to delegate to) and reimplements the fullscreen toggle
     in-place (same `fscreen` + `goFullScreen(tableName)` event convention, just not routed through
     `ReactTableFullScreen`). Verified: full `vitest run` (1316 tests, was already-passing suites
     for the 3 consumers plus a rewritten `BaseDataTable.test.jsx` — now asserts against real
     rendered DOM instead of a mocked `"react-table"` module, since v8 is headless and needs no
     jsdom workaround), `tsc --noEmit` clean, `yarn build` clean.
  2. **DONE (2026-09-19, `feat/tanstack-table-batch2-parameters-basedatatable`).**
     `parameters/BaseDataTable.jsx` (class-based, `class X extends BaseDataTable`, 12 extenders)
     rewritten to v8. The i18n-singleton caveat still holds unchanged: this class still can't be
     `withTranslation()`-wrapped without breaking the inheritance chain, so it still reads `i18n.t`
     directly (see the comment at the top of the file) — orthogonal to the table-engine swap.
     Rather than duplicate batch 1's ~200 lines of grid-rendering/pagination-footer logic between
     the two BaseDataTable wrappers, extracted it into a new shared
     `common/baseDataTable/TanStackGrid.tsx` (the `useReactTable()` setup, the `toTanStackColumn`
     adapter, fullscreen wiring, and the hand-rolled `<table>` + pagination JSX); both wrappers now
     just own their CRUD state/modals and render `<TanStackGrid columns={...} data={...} .../>`.
     Per an explicit standing instruction, `TanStackGrid.tsx` is TypeScript + a functional
     component (new files going forward should be too, to reduce future refactoring — see
     `frontend/types/untyped-modules.d.ts`'s new `declare module "fscreen"` entry, added for this
     file's `tsc` pass). `fetchData`'s signature simplified from v6's `fetchData(state, instance)`
     to a single `fetchData(filter)` — safe, since every subclass already only ever called
     `this.fetchData(this.state.tableState)` with one argument. Also hardened against a malformed/
     empty API response (`data: data.status || []`, was `data: data.status`), found live via a test
     failure, not a reported bug. Investigated a real TanStack v8 caching bug along the way —
     `getCoreRowModel()`'s internal memoization (keyed on `table.options.data`'s *reference*) didn't
     reliably invalidate for `ActivityRefBasics.jsx`/`EditFormule.jsx`'s pricing tables, so a
     just-created or just-deleted row didn't appear until some unrelated re-render happened to
     dislodge the cache. Landed a workaround at the time (unconditionally discarding the memoized
     row model every render) with a long comment misattributing the cause to render-frequency
     "churn" from those callers rebuilding `dataService`/`columns` on every render.
     **Corrected (2026-09-19, by a retroactive review of this merged PR):** that diagnosis was
     wrong. The real cause: `ActivityRefDataService`/`NewFormulePricingDataService` (in-memory mock
     data sources backing those two pages) mutate one long-lived array in place
     (`push`/`splice`) and hand that *same reference* back from `listData()` on every call — so
     `table.options.data` genuinely never changes reference, and the row-model cache is correctly
     (not incorrectly) treating it as unchanged. Real API-backed tables never hit this, since a
     fresh `response.json()` is a new array every time. Fixed at the actual source in
     `feat/tanstack-table-batch3-subcomponent-tables`: both mock services now return a copy
     (`[...this.items]`) from `listData()`, and the blanket per-render cache-discard hack — which
     was silently costing every other `TanStackGrid` table a small amount of unnecessary
     recomputation for a bug only these two callers had — was removed from `TanStackGrid` entirely.
     Removing `react-table` from this file broke test-suite assumptions baked into 4 test files that
     mocked the `"react-table"` package to both stub headers (`col-header` testid) and silently
     swallow the mount-time `onFetchData` call (so no real `fetch()` ever fired): `PlanningsSettings
     .test.jsx`, `PracticeTables.test.jsx`, `Payments/PaymentsSettings.test.jsx`,
     `ParametersChrome.test.jsx`. Fixed by querying real rendered `<thead>` DOM instead of the old
     stub testid, and by adding/reordering `global.fetch` mocks so a delete-error test's own narrow
     override doesn't leak into the mount's own incidental list-fetch. `ParametersChrome.test.jsx`'s
     two BaseDataTable-chrome tests additionally needed a full rewrite: they asserted on
     `previousText`/`nextText`/etc. props once passed straight through to the real `<ReactTable>`
     component, which no longer exist as props at all now that `TanStackGrid` resolves that copy
     internally via `useTranslation` — rewritten to assert against the actual rendered pagination
     footer text instead. Verified: full `vitest run` (1318 tests, was 1316 pre-batch — net +2 from
     the AdhesionSettings-style regression tests folded into the fixed files), `tsc --noEmit` clean,
     and live-checked in the browser (`/parameters/practice_parameters` Band types + Music genre
     tabs, `/parameters/payment_parameters` Payment methods tab including sorting by Label) — no
     console errors, sorting/filtering/pagination all behave as before **for two clicks** — see the
     `enableSortingRemoval` correction below the batch 3 entry for a third-click bug this
     verification pass missed.

     **Follow-up flagged during batch 1 — now resolved differently than expected.** This originally
     described `ActivityRefBasics.jsx`/`EditFormule.jsx` rebuilding `dataService`/`columns` fresh on
     every render as the presumed cause of the caching bug above, and proposed stabilizing their
     identity as the real fix. As corrected in batch 1's own entry above, that wasn't actually the
     cause — the two data services' shared-array mutation was, and that's what got fixed. Rebuilding
     `dataService`/`columns` every render is still real and still slightly wasteful (a fresh
     `useMemo`/module-scope-built identity would reduce unnecessary re-renders), but it's a minor,
     independent efficiency concern now, not a correctness one — no longer treated as a blocking
     follow-up for this item.
  3. **DONE (2026-09-19, `feat/tanstack-table-batch3-subcomponent-tables`).** The 8-file set
     scoped above: `DuePaymentList`, `PaymentList`, `UserList`, `CheckList` (shared
     `ReactTableFullScreen.jsx`) + `LessonList`, `Localisations`, `PackUtilization` (standalone,
     `SubComponent`). **Correction found mid-batch:** `PackUtilization`'s `SubComponent` state was
     never set (declared, always `null`) — same dead-state class as `parameters/BaseDataTable.jsx`
     found in batch 2 — so it needed no real expander support, just the plain uncontrolled
     `onFetchData` migration.

     Extended `TanStackGrid` (additive only, batches 1-2 unaffected) with: `renderSubComponent` +
     an auto-injected expander column (`getExpandedRowModel()`); **controlled** pagination/sorting/
     columnFilters (value + `onXChange` triples, mirroring TanStack's own vocabulary) for
     `DuePaymentList`/`PaymentList`/`CheckList`/`LessonList`, which need externally-resettable
     table state for their "reset filters" button — v6 supported this via controlled props,
     TanStack v8 the same way; `minRows` (blank-row padding); `getRowProps` (per-row `<tr>` props,
     `LessonList`'s v6 `getTrProps`); a `pageSizeOptions` `<select>`; and a per-column custom
     `Filter` render prop (v6's `Filter: ({filter, onChange}) => ...`, used by several of these
     tables for dropdown/checkbox filter-row UI instead of the default text `<input>`).

     Dropped `LessonList`'s `resizable={true}` (column drag-resize — the only table in the app
     using it; an isolated, documented regression rather than building full resize support in
     `TanStackGrid` for one table). Also dropped its `key={filtered.map(f=>f.id).join("-")}`
     remount hack — **this one turned out not to be safe to drop as-is** (found by a follow-up
     code review): three of `LessonList`'s Filter inputs (`level`, and the two `time_interval`
     start/end inputs) were uncontrolled (`defaultValue`, not `value`), so without the remount
     they went stale after "reset filters" — the underlying state reset correctly, but the
     rendered input kept showing its last-typed value. Fixed by making those three (and a fourth,
     same-shaped bug independently found in `DuePaymentList`'s payment-method multi-select) fully
     controlled instead, which is the real fix the removed remount hack was standing in for.

     Found and fixed two real bugs live in the browser, both in `TanStackGrid` itself and present
     since batch 1 with zero prior coverage: a column whose `accessor` returns JSX with no `Cell`
     rendered as the literal string `"[object Object]"` (TanStack's own default `cell` renderer
     does `` `${renderValue()}` `` when none is specified, stringifying a React element instead of
     rendering it — fixed by always setting an explicit `cell`); and clicking the expander
     toggle silently did nothing (TanStack's default `getRowCanExpand` only allows expanding rows
     with real `subRows`, which these flat records don't have — fixed with
     `getRowCanExpand: () => true`). Added `TanStackGrid.test.tsx` (new, TypeScript + functional)
     with direct regression coverage for both plus a basic render smoke test — the first dedicated
     test file for `TanStackGrid` itself, rather than only reached through a consumer.

     Also found and fixed a real, independently-reachable bug in 3 files: the fullscreen button in
     `DuePaymentList`/`PaymentList`/`CheckList` called `events[0]()` where `events` was a
     permanently-empty array — clicking it threw. Rewired through `TanStackGrid`'s working
     fullscreen support (`goFullScreen`, moved here from `ReactTableFullScreen.jsx` once every
     consumer had migrated off it). And applied the same `data.x || []` defensive guard used in
     batch 2 everywhere a fetched response feeds `TanStackGrid` (TanStack throws on `data ===
     undefined`, which v6 tolerated) — including a genuine pre-existing crash path in
     `LessonList.jsx`, where its own `fetchInstancesList` resolves to `undefined` on a swallowed
     fetch error.

     `PlanningsSettings.test.jsx`'s Localisations coverage and `LessonList.test.jsx` both needed
     the same `vi.mock("react-table", ...)`-stub rework as batch 2's fallout (stub swallowed the
     mount fetch and stashed headers/props); `LessonList.test.jsx`'s heavy stash-and-reach-render-
     props technique (used to invoke `Cell`/`Filter`/`SubComponent` directly, bypassing jsdom's
     lack of react-table's DOM measurement) was retargeted at a mock of
     `common/baseDataTable/TanStackGrid` instead — same technique, new module boundary, all 30
     tests kept passing including the day-column locale/timezone/evaluation-level regressions it
     guards. With every real consumer migrated, `ReactTableFullScreen.jsx` is now dead — deleted.

     Verified: full `vitest run` (1323 tests, was 1318 pre-batch), `tsc --noEmit` clean, and
     live-checked every migrated table in the browser (`/payments` all 4 tabs including clicking
     the now-fixed fullscreen button, `/users`, `/activities`, `/monitorStudentPacks`,
     `/parameters/rooms_parameters` including expanding a row) — no console errors beyond the
     browser's own fullscreen-permission rejection (expected in an automated/headless context).

     **Corrected (2026-09-19, by a retroactive review of the batch 2 PR): third-click sorting
     silently broke every `TanStackGrid` table, including batch 2's.** TanStack v8 defaults to
     `enableSortingRemoval: true` — a third click on a sortable header cycles past desc back to
     "unsorted" (`sorting: []`), a state v6 never had (its own header click only toggled asc/desc).
     Every real caller sends `sorted: sorted[0]` straight into the request body; an empty array
     makes `sorted[0]` `undefined`, which `JSON.stringify` drops the key for entirely, and every
     backend `#list_json` handler dereferences `params[:sorted][:desc]` unguarded — 500, silently
     swallowed client-side (no `.catch` anywhere), leaving the table stuck loading forever. Missed
     by batch 2's own live-check (which only clicked each header twice). Fixed by setting
     `enableSortingRemoval: false` in `TanStackGrid`'s `useReactTable()` config, plus a direct
     regression test (`TanStackGrid.test.tsx`) clicking a header three times and asserting
     `sorted` stays non-empty. Landed in `feat/tanstack-table-batch3-subcomponent-tables` since
     the fix lives in the shared component; applies retroactively to every batch 1-3 table.
  4. **DONE (2026-09-19, PR #126, `feat/tanstack-table-batch4a-client-side-tables`).** 5 tables with
     no paginated backend endpoint at all — full dataset arrives as a single embedded prop from the
     ERB view (`PlanningListRooms`, `PlanningListTeachers`, `StopList`, `seasons/SeasonsList`,
     `FailedPaymentImportsPage`). Added an opt-in `manual?: boolean` prop to `TanStackGrid` (default
     `true`, every batch 1-3 caller unaffected; `false` wires TanStack's own `getSortedRowModel`/
     `getFilteredRowModel`/`getPaginationRowModel` instead of a server round-trip). Went through 3
     rounds of `code-reviewer` before push — found more real bugs than any single batch 1-3 PR, all
     the same root cause as batch 1/3's `getCoreRowModel` bug but in these components' own state-
     update code: `StopList` inlined `data.filter(...)` into the `data` prop (new array every
     render → with `manual={false}`, TanStack's own `_autoResetPageIndex` snapped `pageIndex` back
     to 0 on every render, pagination past page 1 unreachable); `FailedPaymentImportsPage`'s Amount
     cell mutated `this.state.data` in place instead of copying it (displayed value went stale while
     the submitted value silently diverged); `SeasonsList`'s activation handler shallow-copied the
     state wrapper but not the `seasons` array itself (a newly-activated season's auto-created
     "next" season never appeared without a full reload). Fixing the Amount-cell bug then introduced
     a *new* page-reset bug (copying `data` on every keystroke re-triggered the same
     `_autoResetPageIndex` mechanism) and exposed a real focus-loss bug (TanStackGrid's `columns`
     memo is keyed on array identity; a class component rebuilding `columns` fresh in `render()`
     gives `flexRender` a new `cell` function identity every keystroke, which React treats as a new
     component type and unmounts/remounts the cell, killing input focus — invisible until this batch
     since it's the first consumer with real typed-into `<input>` cells). Fixed with
     `autoResetPageIndex: false` (redundant for `manual={true}` callers, only removes a harmful
     reset for `manual={false}` ones) and by caching `FailedPaymentImportsPage`'s `columns` array on
     the instance. Regression tests added for all 3 correctness bugs. Verified: `vitest run` (1343
     tests, was 1327 pre-batch), `tsc --noEmit` clean.
  5. Remaining standalone direct importers, split by whether they need item 4's client-mode
     `manual` prop:
     - **Batch 4b — implemented, PR open for review (2026-09-20, `feat/tanstack-table-batch4b-standard-tables`).** 9 files
       already `manual`/`onFetchData`-shaped like batches 1-3, no client-mode gap — `AdhesionList`,
       `generalPayments/PaymentScheduleList`, `generalPayments/SubPaymentList`,
       `mailTemplates/TemplateIndex`, `parameters/ActivityApplications/ApplicationStatusTable`,
       `UserAttach`, `seasons/Holidays`, `eventsRules/EventsRules`, `formules/Formules`. Added 3
       props `TanStackGrid` didn't have yet: `showPagination` (hide the footer), table-wide
       `filterable`/`sortable` overrides, `noDataText`. A `code-reviewer` pass found a genuine
       infinite render loop in `Holidays.jsx` (its `onFetchData` handler rewrote the controlled
       `pagination` prop with a fresh object on every fetch — reference-keyed effect deps fed that
       straight back into firing `onFetchData` again, forever; confirmed via 100%+ CPU on mount in
       a test run) plus a blocking dead-filter-UI bug in `EventsRules` (missing `filterable={false}`
       left two inputs that visibly did nothing, since the backend never reads `filtered` params)
       and several smaller issues (two locale-dependent column ids, a wrong "N results" count on 4
       files, dropped `minRows` padding, a misleading comment on the new table-wide filter/sort
       override semantics). All fixed across 2 follow-up commits, regression test added for the
       infinite-loop fix. Verified: `vitest run` (1367 tests, was 1343 pre-batch), `tsc --noEmit`
       clean.
     - **Batch 4c — implemented, PR open for review (2026-09-20, stacked on batch 4b,
       `feat/tanstack-table-batch4c-client-side-tables`).** 3 client-mode files —
       `evaluation/StudentEvaluationsStats.tsx`, `userPayments/PaymentsList.jsx`,
       `userPayments/DuePaymentsList.jsx` — migrated onto batch 4a's `manual={false}` mode. Caught
       before landing: both payment tables' "select all" checkbox columns had neither `id` nor a
       real accessor (a 4th instance of the locale-dependent-fallback-id class already fixed 3
       times — `FailedPaymentImportsPage`, `Holidays`, `AdhesionList`); here it's worse than a
       locale-dependent id, since the `Header` is itself a JSX checkbox, not a string, so TanStack's
       id-resolution chain hits `undefined` and `createColumn` throws unconditionally, crashing the
       whole table. Fixed with explicit `id`s. A `code-reviewer` pass then found 2 **blocking**
       bugs, both in the *caller* (`PaymentsManagement.jsx`, not the 3 migrated files themselves):
       both `handleSaveDuePayment` and the payment-status-edit handler mutated a shared array/row
       object in place before `setState` — v6 tolerated this (it re-ran its own accessors every
       render regardless of whether data changed), but `TanStackGrid`'s row-model cache is keyed on
       the data reference and per-row values are cached off `row.original`, so neither a due-payment
       edit nor a status change updated the table until a manual page reload. Fixed by copying
       before mutating, matching a third handler in the same file that already did it correctly.
       Also restored a lost rows-per-page selector on `StudentEvaluationsStats` (same "the
       migration works but silently drops a v6 default" class hit repeatedly in batches 4a/4b).
       Verified: `vitest run` (1372 tests, was 1367 pre-batch), `tsc --noEmit` clean.
       **Flagged for future improvement, not a blocker for 4c itself:** `PaymentsList`/
       `DuePaymentsList` get their full dataset via `this.props.payments`/`this.props.data` (a
       payer's payment history), which — unlike batch 4a's genuinely bounded lists (seasons, rooms,
       teachers) — can grow large over a long relationship with the school. Client-side pagination
       matches today's v6 behavior and is fine to ship as-is, but revisit with real server-side
       pagination (a new backend endpoint + view change) if this page's performance or row count
       ever becomes a real complaint. Also, both payment tables use `showPagination={false}` with no
       page-size override, so only the first 20 rows are ever reachable (verified: exact parity with
       v6, not a regression) — logged in `docs/KnownIssues.md` since the 20-row cap now lives inside
       `TanStackGrid` rather than being an obvious per-table choice.
     - **Batch 4d — type-safety cleanup, scoped 2026-09-20 after two real problems the user caught
       in PR #128's review.** (1) `LegacyColumn` was made generic over the row type (`TRow`,
       defaulting to `any` so the ~30 untyped `.jsx` callers are unaffected), but `Cell`'s `value`
       was still `unknown`/cast-at-use-site, since a flat array of heterogeneous per-column
       accessors can't otherwise be typed without a bigger redesign. (2) Several "documented,
       accepted regression" code comments (introduced by the migration's own fix passes, describing
       dropped v6 `style`/`className` column props) turned out not to be documented anywhere and
       were never actually reviewed/accepted by anyone — caught by the user asking "is this
       documented? who accepted it?" A repo-wide audit at the time found no other instance of this
       false-claim pattern; the specific case that prompted it (12 columns across
       `SubPaymentList`/`PaymentsList`/`DuePaymentsList`) was fixed for real in PR #128 (added
       `style`/`className` passthrough to `LegacyColumn`, matching the existing `width` precedent).

       **Part 1 — DONE, PR open for review (2026-09-20, `feat/tanstack-table-batch4d-remove-cell-value`).**
       Removed `value` from `Cell` entirely — every `Cell` across ~40 callers now reads from the
       properly-typed `original: TRow` instead, either directly (a simple accessor) or via a small
       function shared with `accessor` (a computed one, so the logic exists in exactly one place).
       This tsconfig has `allowJs` but not `checkJs`, so `tsc` can't catch a missed `.value`
       reference in a plain `.jsx` file — compensated with an independent, repo-wide grep sweep
       (done twice, once by the implementing pass and once independently by `code-reviewer`) rather
       than trusting the compiler alone. **Turned out not to be a pure refactor**: `code-reviewer`
       found this change fixes a real, previously-undetected bug in `UserList.jsx`, `courses/
       LessonList.jsx`, and `generalPayments/PaymentScheduleList.jsx` — each had a selection-
       checkbox column whose `accessor` read live selection state, and TanStack caches each row's
       accessor result keyed only on the `data` array's *reference*; clicking a row's checkbox
       `setState`d the selection state without changing `data`'s reference, so the cache never
       recomputed and the row's own checkbox stayed visually unchecked (the header "select all" box
       and any bulk-action toolbar, reading the same state directly rather than through the stale
       accessor, updated correctly — only the per-row checkbox was wrong). Reading straight from
       `original` bypasses the cache and fixes it as a side effect. Regression tests added for all
       three. Also found and fixed: `FailedPaymentImportsPage.test.jsx`'s existing stale-value
       regression test (from an earlier batch) no longer actually exercised the bug it was written
       to guard, since the cell it covers stopped going through `getValue()`'s cache as a result of
       this same change — repointed at a column that still does. Verified: `vitest run` (see PR for
       exact count), `tsc --noEmit` clean.

       **Noted, not code-changed**: 8 accessor-only columns (no custom `Cell`, so they still render
       via TanStack's own default `ctx.getValue()` path) exist across `generalPayments/
       {DuePaymentList,PaymentList,SubPaymentList}.jsx`, `courses/LessonList.jsx`, and `userPayments/
       {PaymentsList,DuePaymentsList}.jsx`. All currently read only `this.props.*`/a closured `t`
       (safe — props come from the ERB mount, locale switch is a full server reload), never mutable
       state, so none is a live bug — but the invariant this batch surfaced ("a `LegacyColumn`
       accessor must not close over mutable component state, or its cached value goes stale until
       `data`'s reference happens to change for an unrelated reason") isn't written down anywhere.
       Worth a `docs/KnownIssues.md` line naming it, so a future column doesn't reintroduce the
       batch 4d part 1 bug in a new place.

       **Part 2 — DONE (2026-09-20), both audits confirmed clean, no code changes needed.**
       (a) Re-audited every `LegacyColumn`/`TanStackGrid` caller for `any`/`unknown`/`as unknown as`
       fallout: `TanStackGrid.tsx` is still the only file with `any` (8 occurrences, all the same
       pre-existing internal adapter scaffolding — the `MutableColumnDef` intermediate cast points
       and `buildExpanderColumn`'s helper column — deliberate and already documented, nothing new
       introduced by batch 4d part 1). (b) Re-grepped the whole `frontend/` tree for
       "documented, accepted regression" and equivalent phrasing — zero matches anywhere, confirming
       the PR #128 fix removed every instance and none crept back in. One caveat: audit (b) was
       originally scoped to also re-run once `Activity.jsx` lands, in case that batch's own fix
       passes introduce a similar false claim — worth one more quick grep at that point, though
       nothing suggests it's likely to recur now that this exact pattern has been caught once.
  6. **`Activity.jsx` — implemented, PR #130 open for review (2026-09-25).** The last file in the
     whole migration, deliberately saved for last as the most complex table in the app: one
     `<Activity>` per "desired activity" on the activity-application review page
     (`/inscriptions/:id`), each showing candidate suggestions with an expandable `WorkGroupEditor`.
     Added two new `TanStackGrid` capabilities (both precedented by the existing controlled
     pagination/sorting/columnFilters pattern): `getRowId?: (row: TRow) => string`, and controlled
     `expanded`/`onExpandedChange`. The hardest part — the original code reached into react-table
     v6's internal ref API (`getSortedData`) after an edit, purely to recompute where the edited
     suggestion would land under an active column sort so it could re-expand it at the new index —
     was deleted, not ported: `getRowId={(row) => String(row.id)}` keys `expanded` state by the
     suggestion's own stable id instead of array position, so "the row the user opened" stays the
     same key regardless of how sorting/filtering reshuffles the array; re-expanding an edited
     suggestion is now a 3-line `expanded: {[a.id]: true}`. Two deliberate simplifications given
     real usage (suggestion lists are typically small — pagination only past 10 rows): dropped the
     custom chevron expander icon for `TanStackGrid`'s default ▶/▼, and moved the expand-all/
     collapse-all buttons out of the table (previously in the expander column's filter-row slot,
     which would have needed a new filter-slot-injection capability) into `Activity.jsx`'s own
     surrounding UI. 3 columns (`day`/`type_cour`/`time`) have filter comparators TanStack's
     auto-picked `filterFn` can't reproduce (an object-valued accessor filters out every row via
     reference inequality; a numeric accessor picks range-filtering, not exact match) — these bypass
     TanStack's own column-filter state entirely and filter `suggestions` in application code before
     handing it to `TanStackGrid` as `data`, reusing the exact original v6 comparator logic
     (verified line-by-line against the pre-migration source). A `code-reviewer` pass (full
     line-by-line comparison against the pre-migration file, not just the diff) found 4 real bugs, 2
     high severity: pagination could strand the table on an out-of-range "no data" page when a
     filter narrowed the row count (nothing reset/clamped `pageIndex`, since `TanStackGrid`'s own
     filter-change reset only applies to uncontrolled pagination); the day/type_cour filter
     `<select>`s visually blanked out on every filter change (uncontrolled `defaultValue`, remounted
     by the per-render columns rebuild) even though the filter was still correctly applied
     underneath. Both fixed; also fixed 3 numeric columns silently getting range-filtering instead
     of exact match, and a missing rows-per-page selector. Verified: `vitest run` (1385 tests, was
     1376 pre-batch), `tsc --noEmit` clean, live-checked on `/inscriptions/1` (dev DB) — row
     expansion and the day filter's value-retention fix both confirmed working.
  7. Drop `react-table` from `package.json`/`yarn.lock` and the `KnownIssues.md` entry.
     `ReactTableFullScreen.jsx` (thin v6 wrapper) is already gone — deleted in batch 3 once its
     last 4 consumers migrated off it.

**Side-by-side migration during the transition — resolved 2026-09-16, no action needed beyond
adding the new dependency.** The `react-table-6` idea flagged earlier (republishing v6 under an
alias package name so both versions could stay installed) turned out to solve a problem this
migration doesn't have: that alias only matters for a v6→v7 or v7→v8 jump, where both versions
publish under the *same* npm name (`react-table`) and you need an alias to keep the old one
resolvable. TanStack v8 publishes under a different name entirely — `@tanstack/react-table` — so
`react-table@^6.8.0` and `@tanstack/react-table@^8.21.3` install side by side with zero aliasing;
migrated files import from the new package, everything else keeps importing `react-table`
unchanged. (`react-table-6` itself, checked directly on npm, is legitimate — published by
`tannerlinsley`, react-table's original author, frozen at `6.11.4` since 2019 — just not the right
tool here.) Bundle cost of the temporary overlap is negligible: v6 is ~11kb+2kb CSS per its own
docs, TanStack markets v8 core at ~10-15kb gzip; trivial next to this app's existing FullCalendar/
bootstrap/react-draft-wysiwyg weight. TanStack's own v7→v8 guide explicitly endorses this pattern
("you can keep the old react-table packages installed... use both packages side-by-side for
separate tables"), and a live migration thread ([TanStack/table#4019](https://github.com/TanStack/
table/discussions/4019)) confirms no CSS/runtime conflicts in practice from running both — though
it also describes the jump as "a re-write vs an upgrade" (one dev: ~a week for one complex table),
consistent with sizing `Activity.jsx` as its own batch above. No official or community v6→v8 guide
exists beyond that; bridging the v6→v7 conceptual gap (props-driven monolith → headless hooks +
hand-built markup) falls on this migration's own batches.

**Stale note removed (2026-09-19):** this section used to flag `ActivityRefBasics.jsx`/
`EditFormule.jsx` rebuilding `dataService`/`columns` fresh every render as a correctness follow-up
to tackle after all of item 13's batches land, on the theory that this render churn was the cause of
a real `getCoreRowModel()` caching bug found in batch 1. That diagnosis was wrong — see the
"batch 1 — now resolved differently than expected" correction earlier in this item: the actual cause
was `ActivityRefDataService`/`NewFormulePricingDataService` mutating a shared array in place and
handing back the same reference, fixed at the source in batch 3. Rebuilding `dataService`/`columns`
every render is still real and still slightly wasteful, but it's now just a minor, non-blocking
efficiency nit, not something to schedule as its own pass.

**Sequencing this sets for the rest of the React-version work**: TanStack v8 migration (this item)
→ stabilize → React 17→18 bump (item 14) → TanStack v9 migration, if ever wanted, as its own later
follow-up (only unblocked once 18 has landed).

## 14. React 17 → 18 — pre-check done, not started; sequenced after item 13

First stage of the eventual 17→19 jump (19 removes legacy string refs/context, already ahead of
that since item 12 retired `react-stepzilla`'s). Pre-check (2026-09-16): every React-adjacent
package's real `peerDependencies` checked against the installed tree, not assumed.

- **Real hard blocker**: `@testing-library/react@^12.1.5` requires `react <18.0.0` — must bump to
  v13+ in the *same* commit as the React bump itself, not before (nothing breaks yet) or after
  (breaks every test in between).
- **Confirmed still true from the original survey**: `react_ujs` (`^2.4.3`) needs bumping in
  lockstep — `ReactDOM.render` is gone in 18+.
- **Confirmed clear, no action needed**: `react-select`, `react-hook-form`, `react-final-form`(+
  arrays), `react-modal`, `react-switch`, `react-i18next`, `@fullcalendar/react`,
  `react-draft-wysiwyg`, `@ramonak/react-progress-bar`, `react-toastify`, `react-input-mask`,
  `react-dropzone`, `react-email-editor`, `react-autosuggest` all explicitly support React 18 in
  their published peer deps already.
- `react-table`/`react-loader-spinner` intentionally not re-checked here — item 13 replaces
  `react-table` before this lands, and `react-loader-spinner` is separately tracked in
  KnownIssues.md's "Frontend dependencies" entry as needing its own bump regardless of React's
  version.

Once started: bump react/react-dom → 18, `react_ujs`, `@testing-library/react` → v13+, all in one
commit (per the blocker above), then a real smoke pass — React 18's StrictMode/effect-timing
changes can surface latent lifecycle bugs across this app's ~118 class components, not caught by
`tsc`/a green test suite alone.

## Context this roadmap assumes (don't re-derive, just re-read if needed)

- `docs/KnownIssues.md` and `docs/I18n-Roadmap.md` (Phase 07
  confirmed complete 2026-09-13 — see git history / session notes for the verification method:
  `i18n-tasks health`, menu caption audit, layout grep, mailer subject audit).
- `docs/I18n-Extraction-Gotchas.md` — i18n conventions reference, unrelated to this roadmap but
  created alongside it, worth knowing exists.
- This repo has two remotes: `origin` (upstream `ELVIS-SOFTWARE/elvis`, **never push here**) and
  `fork` (`marcoreni/elvis`, the user's own — push here, or via
  `https://github.com/marcoreni/elvis.git` over HTTPS if SSH/1Password signing is flaky).
- User merges PRs via the GitHub UI; `gh pr merge` is blocked for the assistant.
