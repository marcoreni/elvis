# Modernization roadmap (post-i18n)

Scoped 2026-09-13, after the i18n Phase 07 rollout was confirmed complete and
`docs/KnownIssues.md` was trimmed to its current ~11 sections. This tracks the next batch of
work so it survives a context reset without having to be re-discussed. Update the status line
of each item as it moves; when an item is fully done, remove it and note the fact (with a
commit/PR reference) rather than leaving a stale "done" entry — same discipline as
`docs/KnownIssues.md`.

## 1. CI workflow on develop/main — see `.github/workflows/ci.yml`

CI's `rspec` job has **no Elasticsearch service at all** — `config/environments/test.rb` sets
`Chewy.strategy(:bypass)`, so specs never index/search; two full local runs with zero ES running
produced zero ES-connection errors. Removes a whole class of infra flakiness (was the ES
container's cgroup-v2 JDK crash, see below) from CI's critical path for free. Dev/prod
(docker-compose.yml, docker-compose-dev.yml) still run ES 7.16.3 → bumped to 7.17.28 there, since
those DO search for real — the old JDK NPEs on modern cgroup v2 hosts (verified with a real
index/import/search round trip via `UsersIndex` against 7.17.28: works). Chewy 7.x + ES 7.17 is
the officially-supported combo (the "8.x incompatible" risk floated was Chewy *8.x* needing ES
8.x, not this).

Also fixed: a broken production Rspack build on `develop` (stale `.js` extensions after a TS
rename), locale YAML comments `i18n-tasks normalize` was stripping (moved to `docs/I18n.md`), and
`RequestData`'s type not allowing numbers/booleans in request bodies. A Gemfile-level fix for
`bundle exec <tool>`'s logger crash was tried and reverted — broke Rails boot itself (see
`reference_i18n_tasks_binstub` memory); stick with `bin/i18n-tasks`. See item 5 for the flake this
job will occasionally hit.

## 2. Orphaned-code tracking file — done, see `docs/OrphanedCode.md`

Created, seeded with the two prior deletion commits (`9ad195d8`, `48a62087`). Re-audited
`docs/KnownIssues.md`'s "Dead/unrouted code" section item by item (route + controller action
inspection, not just grep) and deleted 17 confirmed-dead files/routes/actions (logged with
reasoning in `docs/OrphanedCode.md`), verified via a full local `bundle exec rspec` run (300
examples, 0 failures) after. The KnownIssues section is gone — the 2 genuinely-still-open items
(Devise passwords/edit reachable-but-unlinked, missing `editParameters/FormulesParameters`
component) got their own smaller entries instead. README's old "Removed dead code" section now
points at the new doc instead of duplicating it.

## 3. Move hardcoded `Europe/Paris` timezone into configuration — done, `feat/school-timezone-config`

Shipped as env/boot-time config, matching `config.i18n.default_locale`'s category (deploy-time
decision, one Rails process per school per `CLAUDE.md`'s multi-tenancy note) rather than a DB
`Parameter` row:
- Backend: `config.time_zone = ENV.fetch("SCHOOL_TIMEZONE", "Paris")` in `config/application.rb`
  (default preserves today's behavior).
- New `Elvis::SchoolTimezone.iana_name` (`lib/elvis/school_timezone.rb`) resolves Rails' short
  zone name to the real IANA identifier the frontend needs, via
  `ActiveSupport::TimeZone[...].tzinfo.name` — single source of truth, nothing hardcodes the IANA
  name separately.
- Exposed to the frontend the same way locale already is: `data-timezone="<%= ... %>"` on
  `<html>` in all 3 layouts (`application`/`devise`/`simple.html.erb`), read once via
  `document.documentElement.dataset.timezone`.
- New `frontend/tools/timezone.ts` exports `SCHOOL_TIMEZONE`/`SCHOOL_DATE_FORMAT_OPTIONS`,
  replacing the two separate hardcoded `PARIS_DATE_FORMAT_OPTIONS` constants in
  `courses/LessonList.jsx` and `activityApplications/summary/Activity.jsx`.
- Verified: `tsc --noEmit` clean, full `vitest run` (1275 tests) green, `bin/rails runner`
  confirms `Elvis::SchoolTimezone.iana_name` resolves `"Paris"` → `"Europe/Paris"` at boot.
  `docs/KnownIssues.md`'s "Frontend date formatting hardcodes Europe/Paris" entry removed
  (resolved by this item).

## 4. i18n PRs #7–#10 — done, see `fix/i18n-pr7-10-review-findings`

Fresh-eyes review of current develop's state of the 4 areas (not the ancient original diffs)
found 2 real bugs: `UserList.jsx`'s `total` count rendered the raw i18n key on every page load
until the debounced fetch resolved (missing `total: 0` initial state), and
`StudentEvaluationsStats.tsx`'s react-table instance was the one consumer in the repo not passing
the shared `common:reactTable.*` props, so its pagination chrome stayed English-only regardless of
locale. Both fixed, plus a regression test for the second (verified it fails without the fix).
KnownIssues entry removed.

## 5. `DeviseMailer`/`ApplicationController` order-dependent flake — resolved, see `fix/locale-flake-async-queue-adapter`

Root cause: `config/environments/test.rb` had no `config.active_job.queue_adapter` override, so
Rails' global default (`:async`, a persistent `concurrent-ruby` thread pool) applied — real
background threads ran for the whole suite, racing the main thread on I18n's shared translation
lookup and silently resolving via the `en -> fr` fallback safety net on a miss. Fixed by setting
`queue_adapter = :test`. A prior pass had tried `BaseEventJob.queue_adapter = :inline` and ruled
it out — that only covered one caller of the same shared thread pool; Rails' own default adapter
was the wider, actual source. Confirmed via 19 consecutive clean full-suite runs (previously
reproduced within 1-3 runs).

## 6. Replace `tui-calendar` — done, `feat/replace-tui-calendar` (PR #104, Step A: `chore/fullcalendar-v6-bump`)

**Recommendation: FullCalendar, bumped to v6 first** (standalone step, before migrating) — every
feature this app actually uses maps to a native, free, stable FullCalendar v6 API; nothing lost.

- Real consumer: only `planning/Calendar.jsx` (587 lines, one caller: `Planning.jsx`). A second
  `import ti from "tui-calendar"` in `evaluationAppointments/EvaluationAppointmentsManager.jsx` was
  dead (unused import, `ti` elsewhere in that file is an unrelated loop variable) — already deleted
  in an earlier pass, confirmed gone. tui-calendar pinned at `1.8.2` (not `1.8.0`).
- Feature surface: month/week/day views, drag-to-create/move/resize, a large custom per-event HTML
  template (teacher/room labels, icons, roster/occupation/level), custom day-header content
  (teacher presence-sheet link), read-only/multi-select overlay mode. Built-in tui-calendar popups
  are explicitly disabled (`useCreationPopup/useDetailPopup: false`) — not in scope at all.
  Near-zero existing test coverage of the actual widget integration (only the pure template
  function is tested).
- Fork vs upstream (14 commits): only 2 things are real, load-bearing behavior — **15-minute
  snap** on create/move/resize (fork lowered tui-calendar's 30-min default) and **raw domain
  fields grafted onto each event** (`kind`/`teacher`/`activity`/etc., for the custom template).
  The other ~7 commits are for tui-calendar's native popups, which the app doesn't use — nothing
  to replicate there.
- FullCalendar v5→v6: import path changes, `eventContent` semantics, no bundler CSS loader needed
  — manageable, no functional loss. v6→v7 is a much bigger jump (ESM-only, CSS theming rework,
  `temporal-polyfill` dep) — land on v6 for this pass, defer v7's rework to its own.
  `@fullcalendar/resource-timeline` is confirmed a **premium plugin**, tri-licensed: paid
  commercial license, CC BY-NC-ND (non-commercial only, no source modifications), or free under
  **GPLv3** for open-source projects — verified against the `LICENSE.md` shipped in the installed
  `^5.5.1` package and against v6.1.19 on unpkg (the v6 this item targets). Pre-existing, not new,
  but worth knowing. Note: FullCalendar's *upcoming* v7 (still `7.0.0-rc.0` on npm at the time of
  this check, since released stable) switches this tier to AGPLv3 per fullcalendar.io's licensing
  page — irrelevant to the v5→v6 move this item scopes, but re-check if a future v7 upgrade is
  ever considered. Its real consumer turned out to be `planning/practice_planning/PracticePlanning.jsx`
  (not `YearlyCalendar.jsx`/`.tsx` as first thought while planning this item — that component was
  rewritten into a fully custom implementation, `frontend/components/yearlyCalendar/`, with no
  FullCalendar dependency at all; `PlanningModals.test.jsx` still had stale mocks/comments
  referencing the old FullCalendar-based version, cleaned up in Step A).
- Real decision point (not silently assumed): the app's "compare multiple plannings" mode has
  always been one overlaid view, never true side-by-side columns. If that's ever wanted, it needs
  FullCalendar's paid resource-timeline tier or a switch to react-big-calendar (free, native
  resource columns) — not needed for today's feature parity.
- Bundling functional-component + TS conversion while doing this: low-to-moderate risk, worth it —
  the calendar-engine integration code is being written fresh against the new library regardless,
  so there's no extra "convert working code" risk. Add real interaction tests (view switching, at
  minimum) as part of this, since none exist today.

**Step A shipped** (`chore/fullcalendar-v6-bump`): bumped `@fullcalendar/{core,react,interaction,
resource-timeline}` to `^6.1.21`, added `@fullcalendar/resource` (a new separate peer dependency
in v6 that `resource-timeline` didn't need in v5), and dropped `@fullcalendar/daygrid`/`timegrid`
(unused — nothing in the app actually imports them; their v5-era global `.css` imports in
`application.scss` were also dead and removed, since v6 injects its own CSS at runtime). Two files
(`Summary.jsx`, `DuePaymentsList.jsx`) turned out to import `Fragment`/`isValidDate` from
`@fullcalendar/react` instead of their real sources (`react` / a plain `Number.isNaN` check) — an
undocumented re-export that a major bump could easily have dropped; fixed before bumping. Verified
via a real `yarn build` (not just `tsc`/mocked tests, since `PracticePlanning.jsx`'s FullCalendar
usage is mocked out in its own test suite) — full rspec/vitest/tsc all clean after.

**Step B shipped** (`feat/replace-tui-calendar`, PR #104): `Calendar.jsx` rewritten as `Calendar.tsx`,
a functional component wrapping FullCalendar v6 (`dayGridMonth`/`timeGridWeek`/`timeGridDay`)
instead of tui-calendar, as an **adapter** — `Planning.jsx` (1794 lines) and every modal it opens
from a calendar callback (`MultiViewModal`, `EvaluationModal`, `PauseDetailModal`,
`ActivityDetailsModal`, `CreateActivityModal`) needed almost no changes, because the adapter
reconstructs the exact same tui-calendar-shaped "schedule" object (`id`/`title`/`start`/`end`/`kind`/
`isValidated`/`teacher`/`activity`/`activityInstance`/`raw`, with moment-wrapped `start`/`end` so
`.toDate()` still works) from FullCalendar's `extendedProps` on every callback. The one exception:
`MultiViewModal.jsx` read `schedule.start._date` — a private tui-calendar `TZDate` internal, not the
public `.toDate()` API — fixed to use `.toDate()` instead, since the old code was already relying on
an undocumented field rather than the API tui-calendar itself exposed. The 15-minute snap, previously
hardcoded inside the tui-calendar fork's `handler/time/*.js` (not a `Calendar.jsx` option at all), is
now FullCalendar's native `snapDuration: "00:15:00"`. Re-added `@fullcalendar/daygrid`/`timegrid`
(dropped in Step A when nothing used them yet).

Two review passes (code-reviewer subagent) caught real bugs before merge: icon spans relying on
tui-calendar's own removed bundled icon-font CSS (swapped for Font Awesome), a missing
`activityInstance` field rename the tui-calendar fork used to do internally, a private `._date`
dependency (see above), dropped per-event colors, a declined drag/resize left visually applied with
nothing persisted, bogus Jan-1970 dates in month-view day headers, a stringified id breaking
`Planning.jsx`'s strict-equality interval lookups, and no locale wired (English 12-hour time labels).
All fixed; see the PR history for detail. One deliberate, user-visible behavior change from fix #5:
month view now uses FullCalendar's own default day-of-week header instead of the custom one (which
carried a day-number and presence-sheet link) — that header row has no real per-cell date in month
view, so the custom content was rendering nonsense dates there even before the fix. Added 10
interaction tests (view switching, create/click/drag-update adapters incl. revert-on-reject, snap
config, multi-planning read-only gating, day-header content in both month and week view) — the "none
exist today" gap this item originally flagged. Found two pre-existing issues while mapping the
schedule-shape contract (`beforeDeleteSchedule` passing the wrong shape, `StudentModal.jsx` being
dead code, since deleted) — logged in `docs/KnownIssues.md`, not fixed here, since neither was caused
by or blocked this migration. Bundled with the rewrite per the item's own recommendation:
`useTranslation` (not `withTranslation`), real types reusing `entities.ts` in place of `any`, lodash
dropped entirely. See `docs/Jsx-To-Tsx-Migration-Playbook.md` (written alongside this, PR #107) for
the general lifecycle/typing/lodash conventions this established for future `.jsx`→`.tsx` work.

## 7. Migrate `sweetalert2` off the legacy API — done, `chore/sweetalert2-v11-bump` (PR #99, merged)

**Version facts**: `package.json`'s `^7.26.11` and the resolved `7.33.1` (in both `yarn.lock` and
`node_modules`) are not a stale-lockfile mismatch — **7.33.1 is the actual final 7.x release**
(next is `8.0.0`), so the semver range is already maxed out. Latest overall is `11.26.25`.

**The `.fire()` question is resolved: not a bug.** 6 files already call `.fire()`
(`ActivitiesApplicationsList.jsx`, `HandleFamilyMember.jsx`, `Absences.jsx`, `UserForm.jsx`,
`Wizard.jsx`, `AddPreAppFromStopApp.jsx`). Checked directly against the installed
`node_modules/sweetalert2/dist/sweetalert2.js`: `Swal.fire` is a real static method in 7.33.1
(`Swal.fire = function fire() { return _construct(Swal, args) }`), an intentional alias for
calling the default export directly. These 6 files are already using the more future-proof form
— no live bug, nothing to fix independent of the migration.

**No shared wrapper exists** — `SwalBackEndModal.jsx` and `BtnApiElement.jsx` looked like central
wrappers but neither is imported by any other JS file (`SwalBackEndModal` is mounted standalone
via `react_component(...)` from 4 separate ERB views, each passing its own props). **107 files**
import sweetalert2 directly and call it independently — this is a ~107-independent-call-site
migration, not a "fix a few wrappers" one.

**Call-site classification**:
- Old positional/string-arg style (`swal("title", "text", "error")`): only ~4 live sites (2 more
  are commented-out dead code) — small.
- `type:` option (renamed to `icon:` in v8, removed by v9): **83 files, 224 occurrences** — the
  single biggest breaking-change surface.
- `.value` result-shape usage (v11 requires `.isConfirmed`/`.isDenied`/`.isDismissed` instead):
  **70 files**, heavily overlapping with the above.
- `onOpen`/`onClose`/`onBeforeOpen` callbacks (renamed `didOpen`/`didClose`/`willOpen` in v10.3.0):
  6 files — small.
- Bare `swal({...})` calls with no `.fire` (the majority pattern) **will hard-break in v11** — v11
  only exposes `Swal` as a namespace object with `.fire()`/`.mixin()`/etc., no callable default
  export. Effectively all 107 files need a `swal(...)` → `swal.fire(...)` rewrite on top of the
  option renames.
- 15 test files already `jest.mock`/`vi.mock` sweetalert2 — mocks need shape updates too.

**Follow-up check (2026-09-14, against the real v11.26.25 package, not just changelogs) revises
the verdict below** — pulled the actual `sweetalert2@11.26.25` tarball and its `.d.ts`/dist bundle
to check what's *actually* breaking vs. cosmetic:

- **`.value` is NOT breaking.** v11's `SweetAlertResult<T>` interface still has
  `readonly value?: T` alongside `isConfirmed`/`isDenied`/`isDismissed` — existing
  `result.value`-based branching keeps working unchanged after the bump. The 70-file bucket is a
  pure style modernization, safe to defer indefinitely; it does **not** gate the version bump.
- **Bare `swal(...)` calls hard-crash in v11** — verified by requiring the real v11 dist and
  calling it bare: `Class constructor SweetAlert cannot be invoked without 'new'`. This is the one
  truly mandatory, atomic-with-the-bump rewrite (all ~101 non-`.fire()` files).
- **`type:` is a soft break** — v11's dist has no `defaultParams.type` and no icon-lookup keyed off
  `params.type` at all; using it just warns `Unknown parameter "type"` to the console and renders
  no icon. Not a crash, but silent enough in production to require fixing at the same time as the
  bump rather than trusting a later pass to catch it.
- **`onOpen`/`onClose`/`onBeforeOpen` are gone, replaced by `willOpen`/`didOpen`/`didClose`** —
  confirmed both directions: v7.33.1's dist only recognizes the `on*` names (no `did*`/`will*` at
  all), v11's dist only recognizes `did*`/`will*` (old names hit the same "Unknown parameter"
  warning and silently never fire). Because neither version accepts both spellings, this rename
  **cannot be done before or after the bump** — it's forced into the same atomic commit as the
  bump, like `type:`/bare-call.
- **CSS is unaffected** — both v7.33.1 and v11.26.25 resolve `main`/`browser` to the `.all.js`
  bundle (styles auto-injected via JS), so there's no separate CSS import to add/change.

**Revised verdict**: the truly breaking surface (bare-call→`.fire()`, `type:`→`icon:`,
`on*`→`did*`/`will*`, the ~4 positional-arg sites) is forced into **one atomic PR** together with
the version bump — a single global package version means there's no safe way to split it across
independently-mergeable PRs without the app being broken in between. This piece is lower-risk than
it sounds specifically *because* it's mechanical and scriptable (same substitution pattern applies
uniformly), not because it's small. The **only** genuinely independent, safely-deferrable follow-up
is the `.value`→`.isConfirmed`/`.isDenied`/`.isDismissed` modernization (non-breaking, so can land
as its own later PR/PRs, domain-grouped, whenever convenient) plus adding interaction tests for
the highest-traffic confirm/cancel flows (none exist today).

**Shipped** (PR #99, merged): the full mechanical migration in one PR as planned — bare
calls→`.fire()`, `type:`→`icon:`, `on*`→`did*`/`will*`, positional-arg calls converted to object
form, across all ~107 files, via a small AST-driven codemod (not committed — built on
`@babel/parser`+`traverse`, per-file default-import-binding tracking so it wouldn't touch unrelated
`type:` keys elsewhere in the same file). Code review caught a real miss the codemod's single-
binding-per-file assumption couldn't handle (`ActivitiesApplicationsList.jsx` had two separate
`sweetalert2` default imports, `swal` and `Swal` — the codemod only rewrote the `Swal` one's call
site, leaving 6 `swal(...)` calls that would have hard-crashed under v11) plus 3 v9-removed
`*Class`/`inputClass` keys silently dropped elsewhere — both fixed before merge. `.value` was left
untouched as planned (still valid in v11, non-breaking, a safe future follow-up).

**`.value`→`.isConfirmed` cleanup shipped** (2026-09-15, 4 PRs, domain-batched per this repo's
lean-batches convention): every boolean confirm-gate call site across the app (verified file-by-file
against each `.fire()` call's options, not a blind find/replace) rewritten from `.value` to
`.isConfirmed`. Genuine input-value/`preConfirm` sites (status-change `input: "select"` dialogs,
`Holidays.jsx`'s date-range `preConfirm`, the notify-student `input: "checkbox"`, the day-count
`input: "number"`) deliberately left on `.value`, which stays correct and non-deprecated there. This
closes out item 7 entirely.

## 8. Elasticsearch removed entirely — done, `chore/remove-elasticsearch`

Analysis (2026-09-14) found: only 13 files touched Chewy app-wide, all 5 indices were structurally
simple (one shared edge_ngram analyzer, flat fields, no nesting/geo/synonyms/custom scoring), and
there was exactly one *reachable* consumer — `#index` (`POST /omnisearch`, the global search box),
one `multi_match`/`cross_fields`/`operator: and` query across all 5 indices and ~13 fields, "these
words must all appear somewhere," no relevance tuning. `#advanced_search_query`
(`POST /advanced_query`, the ad-hoc `jQuery-QueryBuilder`-driven ES query UI) was the one piece
that would have genuinely resisted a Postgres rewrite — but its page's GET route was already
commented out (same orphaned-code pattern as item 2), unreachable through the app's UI. Given
that, removed Elasticsearch/chewy entirely rather than partially, per explicit instruction to ship
it as "one single PR to get rid of all elasticsearch world":

- **Backend**: deleted `app/chewy/` (5 index definitions), the `chewy` gem, `config/chewy.yml` +
  `config/initializers/chewy.rb`, every `Chewy.strategy(:bypass)`/`update_index`/
  `run_chewy_callbacks` call site (5 models + `application_record.rb`'s `AsyncExecutor`/
  `base_chewy_callbacks`, both only ever used for chewy — see item 9), `healthcheck_controller.rb`'s
  cluster-health check, `entrypoints/init.sh`'s `chewy:upgrade`, and the ES service from both
  `docker-compose.yml` and `docker-compose-dev.yml`.
- **`#index` (omnisearch) rewritten**, not deleted: new `Search::OmnisearchService`
  (`app/services/search/omnisearch_service.rb`) replicates the same "every query word must match
  somewhere across these fields" semantics per source (users/activity_applications/adhesions/
  activity_refs/rooms) via Postgres `ILIKE` + the `unaccent` extension (new migration
  `20260914120000_enable_unaccent_extension.rb`) instead of `tsvector`/`tsquery` — matches this
  codebase's existing `ci_ilike_find`-style convention (`app/models/user.rb`) rather than
  introducing full-text-search infrastructure the app had never used anywhere else. Same
  `{ results: [{ attributes: {...} }], total }` response shape `frontend/components/Omnisearch.jsx`
  already expects — zero frontend changes needed for the live feature.
- **`#advanced_search`/`#advanced_search_query`/`#indexation` deleted** (unroutable/inconsistent
  dead code, not ported), along with `frontend/components/advancedSearch/` (`AdvancedSearch.jsx`,
  `utils.js`, its test), `app/views/search/advanced_search.html.erb`, and the
  `jQuery-QueryBuilder`/`jQuery-QueryBuilder-Elasticsearch` npm packages + their SCSS import.
  `advancedSearch/utils.js`'s one unrelated export (`PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS`,
  colocated but never search-related) moved to `frontend/tools/constants.ts` alongside its sibling
  `export let`/`languageChanged` live-bindings; its test coverage moved to `constants.test.js`.
- **New test coverage**: `spec/requests/search_controller_spec.rb` (9 examples covering all 5
  result kinds, accent/case-insensitive + substring matching, the AND-across-words requirement,
  and the empty/no-match cases) — there was no existing test for this endpoint at all, confirmed
  via a repo-wide grep before starting.
- Verified: full local `bundle exec rspec` (309 examples incl. the new spec, 0 failures — also
  confirmed the new spec doesn't introduce cross-file flakiness via `ActivityApplicationStatus`'s
  class-load-time-memoized `find_or_create_by!` constants and DatabaseCleaner's transaction
  rollback, a real trap the new spec's design tripped into once), `tsc --noEmit` and full
  `vitest run` (1273/1273) both clean, `rubocop` clean on every new/touched file.

## 9. `run_chewy_callbacks` override — NOT dead, live bug found and fixed — 2026-09-14

**Correction to the original finding**: this is not dead code. `run_chewy_callbacks` is a **real
Chewy gem convention method**, not an app-invented name — confirmed by reading the installed gem
source (`chewy-7.3.6/lib/chewy/index/observe/active_record_methods.rb`).

**Correction to this item's own first analysis pass, too**: the override affects **create and
update as well as destroy**, not just destroy. `chewy_callbacks.each { |cb| cb.call(self) }`
(Chewy's default `run_chewy_callbacks`) is wired straight to `after_commit :run_chewy_callbacks,
on: :destroy` for the destroy path — but `Chewy::Strategy::Base#update_chewy_indices(object)`
(`chewy/strategy/base.rb`), which every strategy inherits and which is what
`after_commit :update_chewy_indices, on: %i[create update]` actually calls, is itself just
`object.run_chewy_callbacks` — so the override intercepts *every* commit path, not a destroy-only
one. Verified empirically (see below), not just by reading source this time.

Adhesion/Room/ActivityApplication/ActivityRef/User's own `run_chewy_callbacks` (calling
`base_chewy_callbacks`, `app/models/application_record.rb`) **overrides** Chewy's default via
normal Ruby method resolution — a deliberate customization: move ES reindexing off the
request/transaction thread into a background thread (`AsyncExecutor` / `Concurrent::Async`)
running under a hardcoded `Chewy.strategy(:active_job)`, instead of blocking on Elasticsearch
synchronously inside the commit callback, for **every** create/update/destroy of these 5 models —
i.e. this is load-bearing, high-traffic infrastructure, not an edge case.

**The live bug**: `Chewy.strategy` is stored via `Thread.current.thread_variable_get(:chewy)` —
genuinely per-thread. `config/environments/test.rb`'s `Chewy.strategy(:bypass)` only pushes
`:bypass` onto the *main* thread's stack. The spawned background thread has no such stack yet, so
`Chewy.strategy(:active_job)` inside it lazily initializes a **fresh** stack from
`Chewy.root_strategy` and pushes `:active_job` on top — the test suite's bypass strategy is never
inherited.

**First fix attempt was wrong, caught by actually running the suite**: deleting the override
outright (letting Chewy's synchronous default run under the ambient strategy) seemed like the
simpler of the two options this item originally proposed — but a full local `bundle exec rspec`
after making that change surfaced real, reproducible `Faraday::ConnectionFailed: connection
refused: localhost:9200` failures (confirmed via bisection down to this exact change, with no
Elasticsearch running locally, matching this dev machine's normal state). Root cause: because the
override applies to create/update too, deleting it means routine `FactoryBot.create(:user, ...)`
calls in specs now synchronously hit `update_chewy_indices` → `run_chewy_callbacks` → a real
attempted Elasticsearch round trip, no longer shielded by the (buggy but load-bearing) async
detour. This is exactly why the bug had gone unnoticed: the async thread's connection failures
were silently swallowed (fire-and-forget, nothing awaits it), so the test suite looked green
despite doing real, wasted, occasionally-flaky background work on every relevant commit.

**Actual fix shipped**: kept the async dispatch (needed — see above), but `base_chewy_callbacks`
now captures `Chewy.strategy.current.name` on the *calling* thread before spawning, and only
special-cases `:bypass` — propagating it into the background thread so tests genuinely skip
Elasticsearch as intended — while every other context (production's real strategies) keeps the
original hardcoded `:active_job` dispatch unchanged, zero behavior change there:
```ruby
def base_chewy_callbacks
  caller = self
  calling_strategy = Chewy.strategy.current.name
  AsyncExecutor.new.async.execute do
    Chewy.strategy(calling_strategy == :bypass ? :bypass : :active_job) do
      chewy_callbacks.each { |callback| callback.call(caller) }
    end
  end
end
```
Verified: full local `bundle exec rspec` — 300 examples, 0 failures — both before this fix
(baseline) and after, isolating the change to exactly this method.

## 10. Hardcoded `"fr"`/`"fr-FR"` locale in date/number formatting — done except `bill.html.erb`, `fix/locale-and-untranslated-strings`

Same category of bug as item 3 (a hardcoded constant that should follow a runtime setting) but for
*language*, not timezone — these format dates/numbers in French regardless of the viewer's actual
`i18n.language`/`I18n.locale`:

- **Frontend, straightforward fix**: `frontend/components/activityApplications/EvaluationIntervalChoice.jsx:9-10`
  — `monthNameFormat`/`weekDayDateFormat` are module-level `new Intl.DateTimeFormat("fr", {...})`
  constants, computed once at import time. Needs the same treatment `format.tsx`/`LessonList.jsx`
  already use elsewhere (`Intl.DateTimeFormat(i18n.language, {...})`) — since language can change
  at runtime (locale switcher), these can't stay module-level constants; compute them where
  `i18n.language` is in scope (component render / a `useMemo`), not at import time.
- **Frontend, same pattern for numbers**: `new Intl.NumberFormat("fr-FR", { style: "currency",
  currency: "EUR" })` hardcoded in `generalPayments/DuePaymentList.jsx:1047,1056`,
  `generalPayments/PaymentList.jsx:964`, `generalPayments/CheckList.jsx:403`. All 3 files are
  class components using `withTranslation("payments")`, so `this.props.i18n.language` is already
  available in scope — swap the literal `"fr-FR"` for it. (`currency: "EUR"` is a separate,
  deliberately out-of-scope concern — a deployment/business decision like item 3's timezone, not
  a locale bug — leave it as-is here.)
- **Backend, straightforward fix**: `app/views/devise/registrations/new.html.erb:68` —
  the surrounding copy is properly extracted (`t("views.devise.registrations.new...")`, follows
  the current locale), but the interpolated date uses `I18n.with_locale("fr") { I18n.l(...) }`,
  hardcoding French into an otherwise-translated sentence. Should use the current `I18n.locale`
  (i.e. drop the `with_locale("fr")` wrapper and just call `I18n.l(...)` directly).
- **Backend, NOT a standalone fix — needs its own pass**: `app/views/payments/bill.html.erb:68,101`
  have the same `I18n.with_locale("fr")` pattern, but that entire template (labels, headers,
  "Téléphone:", "Reçu pour la", "Attestation de paiement", etc.) is hardcoded French prose that
  was never i18n-extracted — it predates the i18n rollout and was presumably out of scope then.
  Changing just the two date lines to follow `I18n.locale` would produce a document with a
  translated date sitting inside otherwise all-French text, which is worse, not better. Fixing
  this properly means extracting the whole template (a real, if small, i18n-extraction job), not
  a one-line locale swap — track as its own follow-up rather than bundling with the two fixes
  above.

**Shipped**: all of the above except `bill.html.erb` (still deliberately deferred, same reasoning
as when found). Fixed `EvaluationIntervalChoice.jsx` (module-level constants moved into
`useMemo(() => ..., [i18n.language])`), the 3 `NumberFormat` class components (swapped `"fr-FR"`
for `this.props.i18n.language`), and `devise/registrations/new.html.erb` (dropped the
`with_locale("fr")` wrapper). A final repo-wide sweep also caught a 6th site not in the original
finding — `userPayments/PaymentsSummary.jsx` (5 more hardcoded `"fr-FR"` `.toLocaleString()`
calls) — fixed the same way. Regression test added in `PaymentsSummary.test.jsx` asserting the
footer total's currency formatting actually differs between `fr`/`en`, not just "doesn't throw".

## 11. Hardcoded French UI strings outside the i18n rollout — done, `fix/locale-and-untranslated-strings`

Found while auditing sweetalert2 call sites for item 7 — not a locale-follows-setting bug like
item 10, just plain un-extracted French text that never went through `t()` at all, so it shows in
French for every user regardless of `i18n.language`.

- **Highest impact — `frontend/tools/api.ts:118-129`**: the generic fetch-error fallback (fires
  whenever a request errors with no `.error()` callback registered — the app-wide catch-all) has a
  hardcoded `title: "Oops... une erreur est survenue"` and hardcoded French body text, including a
  typo (`"cod suivant"` should be `"code suivant"`). This is a shared low-level helper (`api.set()`
  is used by nearly every component), so this is the single highest-traffic hardcoded string in
  the app — every unhandled API error surfaces it. `frontend/tools/constants.ts` already
  establishes the pattern for `t()` outside a component (`import i18n from "../i18n"` then
  `i18n.t("common:apiErrors...")`) — reuse that here instead of a hook.
- **`frontend/components/utils/BtnApiElement.jsx`**: hardcoded French swal text (`"Une erreur est
  survenue."`, `"Email envoyé"`) and a suspicious `title: "error"` (line 16) — the literal English
  word "error" as a dialog title looks like a copy-paste placeholder bug, not intentional copy;
  worth checking what this button is actually used for before deciding the real title.
- **`frontend/components/plugins/Plugins.jsx` and `PluginActivationModal.jsx`**: not just the swal
  calls — the entire admin plugin-management UI (buttons, confirmation copy, "Êtes-vous sûr(e) de
  vouloir désactiver/activer ce plugin ?", "Supprimer les données du plugin", etc.) was never
  i18n-extracted. Same category as item 10's `bill.html.erb` finding: a real extraction job for
  2 whole components, not a one-line fix — track as its own pass rather than folding into the
  sweetalert2 migration or item 10's smaller fixes.
- **Unrelated but adjacent, found while checking error pages**: `public/500.html`'s `<title>` reads
  "The page you were looking for doesn't exist (404)" — copy-pasted from `404.html`, wrong for a
  500. Not a locale issue (Rails' static crash pages are deliberately English/dependency-free,
  served when Rails itself may be down — not worth translating), just a plain mislabeled title,
  trivial one-line fix whenever someone's in that file.

**Shipped**: `api.ts`'s generic fetch-error fallback now uses `i18n.t("common:apiErrors...")`
(also fixed the "cod suivant" typo along the way). `public/500.html`'s title fixed to match this
repo's existing 422-page naming convention. `BtnApiElement.jsx` turned out to be genuinely dead
code (zero importers, no ERB `react_component` mount anywhere) — deleted rather than extracted,
logged in `docs/OrphanedCode.md`. The plugin-management UI (`Plugins.jsx`,
`PluginActivationModal.jsx`, `PluginsList.jsx`, `RestartingMessage.jsx`, `PluginCard.jsx`) got a
full extraction pass into a new `plugins` i18n namespace (`frontend/locales/{fr,en}/plugins.json`);
the activate/deactivate confirmation ternary was initially transcribed inverted during extraction,
caught by re-deriving the original logic before it shipped — code review then found the *value*
feeding that ternary (`isActivated`, derived from `Object.keys(selectedPlugins)[0]` rather than the
plugin actually being confirmed) was already wrong before this PR; logged in `docs/KnownIssues.md`
rather than fixed here, since it's an unrelated pre-existing logic bug, not an i18n one. **Fixed**
in the small-fixes batch (2026-09-14): `Plugins.jsx` now passes `pluginID` down, and
`PluginActivationModal.jsx` keys `isActivated` off `activatedPlugins[pluginID]`.

## 12. `react-stepzilla` vendored and rewritten — done, `feat/vendor-react-stepzilla`

Replaces the last remaining exotic (git-pinned) frontend dependency
(`SIXMON/react-stepzilla.git`, no version tag) with a local, typed, functional-component copy —
`frontend/components/utils/ui/StepZilla.tsx`. Feasibility (2026-09-15): ISC-licensed, single
385-line source file; its CSS was already vendored separately (`frontend/components/stepzilla.css`,
predates this change, unrelated to the npm package); the fork's only delta over upstream (a
`componentDidUpdate` nav-resync when `steps.length` changes) was already baked into the installed
source and is preserved as a `useEffect`. Real usage was narrow — 2 consumers (`AddCourse.jsx`,
`Wizard.jsx`), a small prop subset, no `react-validation-mixin` (not even installed).

**Shipped**: full functional-component rewrite, real TS types (`StepZillaStep`,
`StepZillaStepInstance`) instead of `PropTypes`, `useState`/`useRef`/`useEffect` instead of a class
+ legacy string refs (`this.refs.activeComponent` → `useRef`) — the latter also relevant to the
next item (React 19 removes string refs outright). Dropped the HOC-validation branch
(`hocValidationAppliedTo`) entirely: confirmed unused in this app, and it depends on
react-validation-mixin's *own* internal string refs, which a clean rewrite can't meaningfully
type-support anyway. Caught and fixed 2 behavior discrepancies against upstream during the port
(both would have been real regressions, not preserved-on-purpose simplifications): the
`prevBtnOnLastStep` override was silently dropped from the last-step button-visibility calc in an
early draft (covered by a mutation-tested regression case — reverting the fix reproduces the
failure); and the initial per-step `validated` flag was miscomputed based on whether a step has
`isValidated()`, when upstream's real (HOC-validation-only) condition means it's always `true` in
this app regardless. 10 new unit tests (`StepZilla.test.jsx`) plus the existing `AddCourse.test.jsx`
(which mounts the real component, not a mock) all pass; `react-stepzilla` fully removed from
`package.json`/`yarn.lock`/`node_modules`. `docs/KnownIssues.md`'s "Exotic (git-pinned)
dependencies" section is now fully resolved (react-stepzilla was its last entry) and removed.

## 13. `react-table` v6 → TanStack Table — path forward decided, not started

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
  4. Remaining standalone direct importers not covered above (`AdhesionList`, `PaymentScheduleList`,
     `SubPaymentList`, `TemplateIndex`, `ApplicationStatusTable`, `PlanningListRooms`,
     `PlanningListTeachers`, `FailedPaymentImportsPage`, `StopList`, `UserAttach`, `SeasonsList`,
     `Holidays`, `EventsRules`, `Formules`, `StudentEvaluationsStats.tsx`, `PaymentsList`,
     `DuePaymentsList`) — audit each for `manual`/custom-cell usage before sub-batching further.
     `StudentEvaluationsStats.tsx` is already TypeScript, a reasonable early pick here since v8
     ships full TS types natively.
  5. `Activity.jsx` alone, last, once the expander pattern from batch 3 is proven.
  6. Drop `react-table` from `package.json`/`yarn.lock` and the `KnownIssues.md` entry.
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

**Follow-up flagged during batch 1, to tackle once all of item 13's batches land (not before):**
`ActivityRefBasics.jsx` and `EditFormule.jsx` both reconstruct their `dataService` and `columns`
props fresh inside `render()` on every render, instead of building them once and reusing. Found
while root-causing a real bug in batch 1 (rows not appearing after create — fixed by resetting
`BaseDataTable`'s internal TanStack row-model cache unconditionally every render, see that fix's
commit message for the full trace). Both components sit inside a shared `react-final-form` `Form`
that re-renders on every field interaction anywhere in the whole multi-tab form, so this table gets
re-rendered far more often than its own state changes would suggest, and rebuilding `dataService`/
`columns` on every one of those renders is pure waste on top of that. Stabilizing their identity
(build once — constructor for the class component, once via a stable pattern for the functional
one — only rebuild when their real inputs change) would cut that churn at the source; the
unconditional cache reset in `BaseDataTable.jsx` would then rarely matter in practice, though it
should stay regardless as a correctness safety net for any caller with similar habits. Scoped as
its own pass after the rest of item 13's batches, since it touches caller components outside
`BaseDataTable.jsx` itself and other consumers may have the same pattern worth auditing together
rather than piecemeal.

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
