# Modernization roadmap (post-i18n)

Scoped 2026-09-13, after the i18n Phase 07 rollout was confirmed complete and
`docs/KnownIssues.md` was trimmed to its current ~11 sections. This tracks the next batch of
work so it survives a context reset without having to be re-discussed. Update the status line
of each item as it moves; when an item is fully done, remove it and note the fact (with a
commit/PR reference) rather than leaving a stale "done" entry — same discipline as
`docs/KnownIssues.md`.

## 1. CI workflow on develop/main — done, see `.github/workflows/ci.yml` (pushed to develop 2026-09-13)

Five jobs on push/PR to `develop`/`main`: `rspec` (with `postgres:14.0` + ES `7.16.3` + `redis`
service containers, builds `public/packs-test/` via `RAILS_ENV=test bin/shakapacker` first — a
stale/missing manifest otherwise causes ~100+ spurious failures), `i18n-tasks health`, `vitest`,
and `tsc`/`rubocop` gated on regression past a checked-in baseline (5 / 1037) rather than failing
on the pre-existing backlog. `plugins.json` is gitignored/absent from a fresh checkout, so
`bundle install` installs zero plugin gems and no `GITHUB_TOKEN` secret is needed. Not yet
confirmed green from an actual Actions run (no push happened from within this session before this
was written) — worth checking the first real run.

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

## 4. i18n PRs #7–#10 — re-review to clear the KnownIssues entry — status: not started

`docs/KnownIssues.md` still lists these four early PRs (`extract-users`, `extract-evaluation`,
`extract-payments`, `common-react-table-keys`) as never having gone through the specialized
`code-reviewer` agent. User wants them double-checked now so the entry can be removed. Given the
roadmap's own note that "every one of them has since been re-touched, tested, and reviewed by
later lots," a full fresh-eyes review of current develop's state of those areas (rather than
re-reviewing the original isolated diffs, which are ancient history at this point) is the more
useful check. Dispatch `code-reviewer` for this; if clean, delete the KnownIssues entry.

## 5. `DeviseMailer`/`ApplicationController` order-dependent flake — status: not started, wants a real resolution

User: *"I would prefer things to be clear."* This is the one remaining genuinely-unresolved
investigation in `docs/KnownIssues.md` — a wall-clock-timing Heisenbug (not simple ordering),
confirmed across three separate investigation passes already (see that section's full writeup:
best lead so far is that a failing example's `mail.body.encoded` produces **zero** render events
yet returns byte-identical stale layout content — points at something in the
ActionMailer/ActionView render-and-cache path, not a locale-variable bug). Needs a dedicated,
patient investigation pass — possibly using `TracePoint`/`ObjectSpace` introspection rather than
`puts`/notification subscribers (which perturb the timing enough to stop the repro, per prior
attempts). Worth deciding up front how much budget to spend before accepting "documented but
unresolved" as the final state — this bug has already resisted three investigation passes.

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
