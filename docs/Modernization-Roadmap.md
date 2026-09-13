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

## 3. Move hardcoded `Europe/Paris` timezone into configuration — status: not started, mechanism TBD

Currently hardcoded in two places (see `docs/KnownIssues.md`'s "Frontend date formatting hardcodes
Europe/Paris" entry, being superseded by this item):
- Backend: `config.time_zone = "Paris"` in `config/application.rb:50`.
- Frontend: `PARIS_DATE_FORMAT_OPTIONS` constants in `courses/LessonList.jsx` and
  `activityApplications/summary/Activity.jsx`.

User's instruction: *"put it into configuration (database or env/setup, I'll let you choose)."*
Leaning toward **env/boot-time config** rather than a DB `Parameter` row, because:
- `config.time_zone` is read at Rails boot, before any DB-backed `Parameter` lookup makes sense
  (and changing it at runtime without a restart wouldn't reliably propagate through
  already-open connections/caches anyway).
- Per `CLAUDE.md`'s multi-tenancy section, this app is deployed **one Rails process per school**
  (not a shared multi-tenant DB) — a timezone is a deploy-time/environment decision, same
  category as `config.i18n.default_locale`, not admin-editable runtime content like
  `NotificationTemplate` bodies.

Proposed shape (confirm before implementing): an env var (e.g. `SCHOOL_TIMEZONE`, default
`"Paris"` for backward compat) read in `config/application.rb`, exposed to the frontend the same
way other boot-time config already reaches React (check how `i18n.language`/locale currently gets
to the frontend — likely a bootstrap prop or a small `window.*` global set by a layout) so
`PARIS_DATE_FORMAT_OPTIONS` becomes a computed constant off that value instead of two separate
hardcoded frontend constants. Revisit if a DB-backed setting turns out to be preferred instead
(e.g. if the app ever moves toward runtime-configurable multi-school support — see the
architectural-fit investigation from earlier in this project, if that doc still exists).

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
  **premium plugin** (free only under AGPLv3) — pre-existing, not new, but worth knowing.
- Real decision point (not silently assumed): the app's "compare multiple plannings" mode has
  always been one overlaid view, never true side-by-side columns. If that's ever wanted, it needs
  FullCalendar's paid resource-timeline tier or a switch to react-big-calendar (free, native
  resource columns) — not needed for today's feature parity.
- Bundling functional-component + TS conversion while doing this: low-to-moderate risk, worth it —
  the calendar-engine integration code is being written fresh against the new library regardless,
  so there's no extra "convert working code" risk. Add real interaction tests (view switching, at
  minimum) as part of this, since none exist today.

## 7. Migrate `sweetalert2` off the legacy callback API — status: not started, feasibility check requested first

Currently on sweetalert2 `7.33.1`(ish — confirm exact pinned version), latest is `11.26.25` — a
callback-based `swal({...})` API vs. a promise-based `swal.fire({...})` API, with the breaking
change landing somewhere in the 9.x line (per the existing `docs/KnownIssues.md`/dependency-bump
research). User's specific concern, worth checking **before** committing to the migration:

> *"I think that in some cases old developers decided to use new syntax with current version
> (`swal.fire()` instead of `swal()`). I don't think that new syntax is compatible [with the
> currently-installed old version], so that may already be an issue."*

First step: audit every sweetalert2 call site (dozens, per the existing dependency-bump research
— both direct component usage and any wrapper in `frontend/tools/api.js`) and classify each as
using the **old callback syntax** (`swal(title, text, type, callback)` / object-config-with-legacy-shape)
vs. **already using `.fire()`**. If `.fire()` calls already exist against the old package version,
that's worth understanding on its own merits first (is it silently working via some shim/whatever
sweetalert2 7.x actually exposes, or is it a latent bug independent of any migration?) — check this
regardless of whether the bump happens, since it might be a real, currently-live bug.

Then assess actual migration feasibility to `11.x`: confirm compatibility with the current
React/webpack/babel-vs-rspack+swc stack (post `feat/bump-shakapacker`), inventory every
call site's exact API surface used (icons, custom HTML, input types, chained `.then()`
callback-argument shape changes, `swal.close()`/`swal.getPopup()`-style follow-up calls),
and produce a real migration plan (or a "not feasible yet, here's why" writeup) before touching
code. **Explicit ask**: if migration turns out feasible, do it in one pass rather than
"fixing" the existing `.fire()` call sites to work with the old version first and then
re-touching them again for the real migration — avoid the double-churn.

## 8. Do we need Elasticsearch at all? — status: not started, deep dive requested

CI dropped ES entirely (item 1) since tests never touch it, but dev/prod still run it for 5 real
chewy indices (`app/chewy/`: activities, activity_applications, adhesions, salles, users) backing
`advancedSearch` and admin search UIs — not vestigial today. Open question: is ES actually earning
its infra cost (a whole extra service to run/deploy/upgrade) vs. e.g. Postgres full-text search
(`pg_trgm`/`tsvector`) for this app's actual query patterns (mostly autocomplete/name lookups per
the index definitions, not complex aggregations). Needs: inventory what each index's search
UI actually requires (fuzzy/prefix matching, faceting, ranking), whether Postgres could cover it,
and a real migration-cost estimate — not a snap decision.

## 9. Dead `run_chewy_callbacks`/`base_chewy_callbacks` — status: not started, small

Found while investigating item 5's flake: `run_chewy_callbacks` is defined in 5 models
(`app/models/{adhesion,room,activity_application,activity_ref,user}.rb`) and calls
`base_chewy_callbacks` (`app/models/application_record.rb`), which spawns a real background
thread per call (`AsyncExecutor` includes `Concurrent::Async`) to run `chewy_callbacks` under
`Chewy.strategy(:active_job)`. `run_chewy_callbacks` itself is called nowhere in the codebase
(checked via plain grep across `app/`/`lib/`) — likely dead, but confirm it's not invoked via a
naming-convention/metaprogramming hook (chewy's own callback wiring, an `EventHandler` subscriber,
`method_missing`) before deleting. Small either way: if genuinely dead, delete the method + log in
`docs/OrphanedCode.md` (item 2); if it turns out to be a missing wire-up (should be called
somewhere but isn't), that's a different, possibly more interesting bug about chewy indexes not
updating for these 5 models outside their `update_index` macro's own default hooks.

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
