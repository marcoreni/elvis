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

## 2. Orphaned-code tracking file — status: not started

New file, e.g. `docs/OrphanedCode.md` (English). Purpose: a durable, searchable record of
everything ever deleted from this codebase on suspicion of being dead/unrouted, so that when the
user reports something like *"if I click here I get a 404, was there a view/controller for this
that just got disconnected?"* there's a fast path to check instead of spelunking git log.

Must include, for each deleted item: the commit SHA, what was deleted (file paths), what it was
for (route/controller/feature), why it was believed dead, and the exact `git show <sha>^:<path>`
recovery incantation. Known entries to seed it with:
- **`9ad195d8279a362d455861f3ce74948f88d61f38`** — needs to be looked up and documented (not yet
  investigated this session).
- `app/views/evaluation_level_ref/{create,update}.html.erb` — deleted in `feature/i18n-06-extract-evaluation`
  commit `48a6208` (merged via `4a32bac`). Already documented with recovery command in the current
  `docs/KnownIssues.md` "Dead/unrouted code" section — migrate that entry here.
- The dead `ConflictDisplayItem` component (removed during the `planning/Calendar.jsx` i18n lot,
  per that KnownIssues section) — was referenced only from commented-out JSX, confirmed genuinely
  unreachable, no plugin-recovery caveat needed, but still worth a line in the log for completeness.
- Anything else found via `git log --diff-filter=D` across the session's many branches — worth a
  systematic sweep, not just memory-recall, when this is picked up.

**Then**: re-audit the current `docs/KnownIssues.md` "Dead/unrouted code awaiting a plugin +
production audit" section item by item. For anything that, after double-checking (grep for
routes/references, check plugin loader patterns, check `NotificationTemplate` bodies where
relevant), still looks genuinely safe to delete — delete it now, and log it in the new
`docs/OrphanedCode.md` with full recovery info. The user has explicitly pre-authorized this:
*"If you want to delete more stuff that looks orphaned, after double checking... feel free to
delete anything you see fit."* Update/shrink the `KnownIssues.md` section accordingly (or remove
it entirely if everything in it gets resolved one way or the other).

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

## 6. Replace `tui-calendar` — status: not started, planning phase only requested

Full context: `tui-calendar` is a git-pinned fork (`SIXMON/tui.calendar` of `nhn/tui.calendar`),
1426 commits behind upstream, with 14 commits of real app-specific behavior (data-model
conformance + scheduling-precision tweaks — see `docs/KnownIssues.md`'s "Exotic dependencies"
section for the existing research). User wants to get rid of it entirely. Candidates already in
mind: **FullCalendar** (already a project dependency, currently `@fullcalendar/*` `^5.5.1`/`^5.5.0`
— used elsewhere, e.g. `YearlyCalendar.jsx` was already migrated onto it during
`feat/bump-shakapacker`) or **react-big-calendar** (not currently a dependency).

User's explicit planning steps, in order — **do the planning/research first, do not start
migrating code yet**:
1. **List tui-calendar's feature surface as actually used**, pinned at the version in use
   (`1.8.0` per the user — confirm against `package.json`/lockfile). This means: audit every
   feature of tui-calendar this app actually exercises (week/day views, drag-to-create,
   drag-to-resize, the custom `monthGridHeaderExceed`/`weekDayname` template functions, the
   15-minute-step/minimum-duration/nearest-threshold scheduling-precision behavior, whatever
   `planning/Calendar.jsx` and any other tui-calendar consumer actually use) — not a
  generic tui-calendar feature list, the subset this app depends on.
2. **Map what the fork actually changed vs. upstream** —
   `https://github.com/nhn/tui.calendar/compare/main...SIXMON:tui.calendar:master` — turn the
   already-known "14 commits, 2 conformance + scheduling-precision tweaks" summary into a
   concrete, itemized feature list (what exact behavior each commit adds), since that's the part
   that has to be explicitly re-implemented or found in a replacement, not just "migrate and hope."
3. **For each item from 1+2, check feasibility in FullCalendar (free tier) and in
   react-big-calendar** — does the target library support it natively, via a plugin/premium
   add-on (note if something needs FullCalendar's paid premium plugins — flag as a real decision
   point, not silently assumed), or not at all. Produce a feature-by-feature matrix, then a
   recommendation.

**Before any of that**, consider bumping FullCalendar to its latest version first (currently on
`^5.x`, latest is much newer) — check for breaking/layout changes in the intervening majors, since
doing that bump *before* the tui-calendar migration avoids doing the FullCalendar upgrade twice
(once now, once mid-migration).

**Migration principle** (explicit from the user): retain all existing functionality, custom or
not. If something would be lost (layout/UI/UX-level, not just data-level), that has to be called
out explicitly as a decision point — "is losing X acceptable, or do we need to (re)implement it on
the new library" — not silently dropped.

**Opportunistic scope while touching this code**: the user is open to migrating the components
that currently use tui-calendar (`planning/Calendar.jsx` and any siblings) to **functional
components + TypeScript** as part of this work, matching the user's own in-flight, separate
TS-conversion effort elsewhere in the frontend. Bundle this in if it doesn't meaningfully increase
migration risk; don't force it if it does.

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
