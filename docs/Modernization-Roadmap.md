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

## 13. `react-table` v6 → TanStack Table — done, all batches merged, dependency dropped

Migrated all ~26 direct `react-table` v6 importers to `@tanstack/react-table` v8 via a shared adapter
component, `frontend/components/common/baseDataTable/TanStackGrid.tsx` (v6-shaped `LegacyColumn`
props in, real TanStack v8 underneath — `manual` toggles server- vs client-side pagination/sorting/
filtering). Sequenced *before* the React 17→18 bump (item 14): TanStack v8 works under React 17
(`peerDependencies: {react: ">=16.8"}`), only v9 needs 18+, so doing v8 first keeps the two
migrations independently bisectable.

Batches, in order: #122 (`common/BaseDataTable.jsx`), #124
(`parameters/BaseDataTable.jsx` + 12 extenders), #125 (the
`SubComponent`/expander/`ReactTableFullScreen` set, 8 files), #126/#127/#128 (the
remaining standalone importers, split into client-mode / standard server-paginated /
more client-mode sub-batches), #129 (removed `Cell.value` from `LegacyColumn` app-wide),
#130 (`Activity.jsx`), #131
(`ActivitiesApplicationsList.jsx`/`AdhesionSettings.jsx`/`PaymentsSummary.jsx` — 3 files
missed by every earlier batch's scoping pass, found only after #130 was merged as "the
last file" -- the process lesson (re-verify completeness against a fresh exhaustive
check, never a running batch tally) is recorded in project memory), then
`chore/drop-react-table-dependency` (removed the now-unused `react-table` from
`package.json`, regenerated `yarn.lock` -- which also drops its transitive
`@types/react-table` and the version ranges it alone needed on `classnames`/`react-is`,
both still installed at unchanged versions for other packages -- plus a dead CSS import
and an obsolete `KnownIssues.md` note). Full investigation detail (the TanStack
caching gotchas, the several real bugs found live via `code-reviewer` passes, the
reference-identity/mutation pitfalls that recurred across batches) lives in each PR's
own description and commit messages, not here.

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
