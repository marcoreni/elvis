# Project-specific Claude Code subagents

This repo defines subagents under `.claude/agents/`, on top of Claude Code's built-in ones
(`Explore`, `general-purpose`, `Plan`, ...). They exist so work on Elvis can be split along the
seams the codebase itself uses (see `CLAUDE.md`: Rails backend under `app/` and `lib/elvis/`, React
frontend under `frontend/`, mounted per-view rather than a single SPA), and so the review /
translation discipline built up over the i18n chantier is captured somewhere reusable.

## The agents

- **`backend-specialist`** — Ruby/Rails: `app/`, `lib/elvis/`, `db/`, `config/`, RSpec/Minitest.
  Knows this repo's specific conventions (destroy-job pattern, event/listener system, plugin
  system, `Parameter`/`Settings` for runtime config) rather than generic Rails advice.
- **`frontend-specialist`** — React: `frontend/components/`, `frontend/tools/`, `frontend/packs/`.
  Knows that this isn't a client-routed SPA (each Rails view mounts its own React island via
  `react_component`), and this repo's dev-server quirks (`shakapacker` via `foreman start`, not
  `yarn start`).
- **`orchestrator`** — for tasks that genuinely span both sides (e.g. a new API endpoint plus the
  component that calls it). It scopes the backend/frontend seam itself (API contract: route,
  params, response shape), delegates each half to the matching specialist, and reconciles the two
  results before reporting done. It does not do deep implementation work itself.
- **`code-reviewer`** — high-effort pre-merge review. Reviews **only the working branch's own diff
  against `develop`** (not `main...develop`), runs the actual test suites / linters rather than
  reading only, and ranks findings correctness-bugs-first with concrete failure scenarios. Carries
  the i18n-extraction pitfall checklist (missing `const { t } = this.props` per method, an
  unwrapped `withTranslation` export, `{{count}}` vs `{{n}}`, incomplete `t`-threading into
  module-level helpers, fr/en parity, the verbatim-copy policy) and the backend hot-path / open-
  redirect / `Parameter` cache concerns. Every one of those i18n items shipped past an inline read
  and was caught only by a structured pass — hence a dedicated agent. Use before merging any PR.
- **`translator`** — owns the translation layer: `config/locales/**.yml` and
  `frontend/locales/**/*.json`. Enforces the **verbatim-extraction policy** (French source copied
  exactly, typos preserved and logged in `docs/KnownIssues.md`, corrected only when the user asks,
  a review flags it, or two spellings must be unified), correct French typography/accents,
  idiomatic English matching the repo's established renderings ("formule" → "package", etc.),
  exact fr/en key parity (`bin/i18n-tasks health` / flatten-diff), and the `{{n}}` vs `{{count}}`
  interpolation rule. Invoke for any task that adds, changes, or audits translation strings.
- **`qa`** — writes and fixes tests: RSpec request/model/controller specs and Vitest component
  tests. Knows the two-suite split (RSpec preferred, Minitest broken), the thin factory set and
  its edges (no `Room`/`Location`/`Season`/`Formule` factory; `:activity_ref` needs
  `activity_ref_kind:`), the `config.order = :random` flakes, the cache-bust `around` for
  `Season.current`/`Parameter`, and the frontend test tricks the i18n work accumulated
  (`i18n.changeLanguage` switching, jsdom stubs for canvas / bootstrap `aria-hidden` modals /
  tui-calendar, mocking heavy children + the `tools/api` chain). Invoke to add coverage for a
  change or to diagnose a failing spec.

Use `backend-specialist` / `frontend-specialist` directly for single-sided work; reach for
`orchestrator` only when a task genuinely needs both halves coordinated. Run `code-reviewer`
before every merge. Route translation strings through `translator` (a `frontend-specialist` doing
a component refactor hands the strings off rather than writing the locale files ad hoc), and test
coverage through `qa`.

## Model choice

- `backend-specialist`, `frontend-specialist` — Sonnet 5 (`model: sonnet`).
- `translator`, `qa` — Sonnet 5. Both are well-bounded implementation tasks Sonnet handles; bump
  either to opus only if quality regressions in that role become a recurring review finding.
- `orchestrator` — **Opus 5** (`model: opus`), promoted 2026-08-30. The cross-cutting
  seam/reconciliation judgment is the role most likely to benefit from a stronger model, which
  the original "keep it simple, all Sonnet" note already anticipated.
- `code-reviewer` — **Opus 5** (`model: opus`). Pre-merge review is where a stronger model earns
  its keep; the whole point of the agent is depth.

## Where this came from

`backend-specialist` / `frontend-specialist` / `orchestrator` were written 2026-08-26 alongside the
PR #2 i18n review fixes. `code-reviewer`, `translator` and `qa` were added 2026-08-30, and the
orchestrator moved to Opus, after the payments + planning i18n domains — distilling the review
rigor, the verbatim-translation policy, and the test patterns (factory edges, jsdom stubs,
`i18n.changeLanguage` switching) that had been carried informally, and in the session memory,
across ~20 stacked PRs.
