# Project-specific Claude Code subagents

This repo defines three subagents under `.claude/agents/`, on top of Claude Code's built-in ones
(`Explore`, `general-purpose`, `Plan`, ...). They exist so full-stack work on Elvis can be split along
the same backend/frontend seam the codebase itself uses (see `CLAUDE.md`: Rails backend under `app/`
and `lib/elvis/`, React frontend under `frontend/`, mounted per-view rather than a single SPA).

## The three agents

- **`backend-specialist`** — Ruby/Rails: `app/`, `lib/elvis/`, `db/`, `config/`, RSpec/Minitest. Knows
  this repo's specific conventions (destroy-job pattern, event/listener system, plugin system,
  `Parameter`/`Settings` for runtime config) rather than generic Rails advice.
- **`frontend-specialist`** — React: `frontend/components/`, `frontend/tools/`, `frontend/packs/`.
  Knows that this isn't a client-routed SPA (each Rails view mounts its own React island via
  `react_component`), and this repo's specific dev-server quirks (`shakapacker` via `foreman start`,
  not `yarn start`).
- **`orchestrator`** — for tasks that genuinely span both sides (e.g. a new API endpoint plus the
  component that calls it). It scopes the backend/frontend seam itself (API contract: route, params,
  response shape), delegates each half to the matching specialist, and reconciles the two results
  before reporting done. It does not do deep implementation work itself.

Use `backend-specialist` or `frontend-specialist` directly for single-sided work — only reach for
`orchestrator` when a task actually needs both halves coordinated.

## Model choice

All three currently use Sonnet 5 (`model: sonnet`). This was a deliberate simplicity choice over
giving the orchestrator a stronger/pricier model for cross-cutting judgment calls — revisit if the
orchestrator's synthesis quality turns out to be the bottleneck in practice, since that's the
role most likely to benefit from a stronger model if one becomes needed.

## Where this came from

Written 2026-08-26, alongside the fixes for PR #2's i18n review findings
(`docs/I18n-PR2-Review-Findings.md`), in response to a request to have backend/frontend-specialized
agents available for this repo going forward.
