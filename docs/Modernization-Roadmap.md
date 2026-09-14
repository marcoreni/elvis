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

## 6. Replace `tui-calendar` — planning done 2026-09-14, migration not started

**Recommendation: FullCalendar, bumped to v6 first** (standalone step, before migrating) — every
feature this app actually uses maps to a native, free, stable FullCalendar v6 API; nothing lost.

- Real consumer: only `planning/Calendar.jsx` (587 lines, one caller: `Planning.jsx`). A second
  `import ti from "tui-calendar"` in `evaluationAppointments/EvaluationAppointmentsManager.jsx` is
  dead (unused import, `ti` elsewhere in that file is an unrelated loop variable) — delete
  separately, zero risk. tui-calendar pinned at `1.8.2` (not `1.8.0`).
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
  `@fullcalendar/resource-timeline` (already used by `YearlyCalendar.jsx`) is confirmed a
  **premium plugin**, tri-licensed: paid commercial license, CC BY-NC-ND (non-commercial only,
  no source modifications), or free under **GPLv3** for open-source projects — verified against
  the `LICENSE.md` shipped in the installed `^5.5.1` package and against v6.1.19 on unpkg (the v6
  this item targets). Pre-existing, not new, but worth knowing. Note: FullCalendar's *upcoming*
  v7 (still `7.0.0-rc.0` on npm, not stable) switches this tier to AGPLv3 per fullcalendar.io's
  licensing page — irrelevant to the v5→v6 move this item scopes, but re-check if a future v7
  upgrade is ever considered.
- Real decision point (not silently assumed): the app's "compare multiple plannings" mode has
  always been one overlaid view, never true side-by-side columns. If that's ever wanted, it needs
  FullCalendar's paid resource-timeline tier or a switch to react-big-calendar (free, native
  resource columns) — not needed for today's feature parity.
- Bundling functional-component + TS conversion while doing this: low-to-moderate risk, worth it —
  the calendar-engine integration code is being written fresh against the new library regardless,
  so there's no extra "convert working code" risk. Add real interaction tests (view switching, at
  minimum) as part of this, since none exist today.

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

## 10. Hardcoded `"fr"`/`"fr-FR"` locale in date/number formatting — status: not started, found 2026-09-14

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

## 11. Hardcoded French UI strings outside the i18n rollout — status: not started, found 2026-09-14

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

## Context this roadmap assumes (don't re-derive, just re-read if needed)

- `docs/KnownIssues.md` (~273 lines as of this roadmap) and `docs/I18n-Roadmap.md` (Phase 07
  confirmed complete 2026-09-13 — see git history / session notes for the verification method:
  `i18n-tasks health`, menu caption audit, layout grep, mailer subject audit).
- `docs/I18n-Extraction-Gotchas.md` — i18n conventions reference, unrelated to this roadmap but
  created alongside it, worth knowing exists.
- This repo has two remotes: `origin` (upstream `ELVIS-SOFTWARE/elvis`, **never push here**) and
  `fork` (`marcoreni/elvis`, the user's own — push here, or via
  `https://github.com/marcoreni/elvis.git` over HTTPS if SSH/1Password signing is flaky).
- User merges PRs via the GitHub UI; `gh pr merge` is blocked for the assistant.
