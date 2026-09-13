# Known issues

Tracked bugs/gaps that are known but deliberately not fixed yet, with enough detail to pick back up
later. When one gets fixed, remove its entry (the fix's commit message/PR is the record, not this
file).

## Minitest feature specs (`test/features/`) can't load — Capybara spec DSL, not a browser/asset gap

Found 2026-08-26 while getting the RSpec suite fully green, root-caused 2026-08-27 while fixing the
rest of `test/models`/`test/controllers` (see below — all of those are now green, this is the one
remaining Minitest gap). All three `test/features/*_test.rb` files use Capybara's spec DSL at the
top level (`feature "..." do ... scenario "..." do ... end end`), but the installed `minitest-rails`
gem only aliases `scenario`/`background`/`given` onto `ActionDispatch::SystemTestCase` (see
`.../gems/minitest-rails-6.1.1/lib/minitest/rails/capybara.rb`), not onto a plain `describe` block
(which is what `feature` aliases to). Every `scenario` call raises `NoMethodError` at load time —
`bin/rails test` (no args) loads all three, so this one crash blocks every other Minitest file from
running unless `test/features` is excluded from the run.

Confirmed this is *not* about a missing browser driver: only the bare `capybara` gem is in the
Gemfile (no `selenium-webdriver`/`cuprite`/etc.), so `Capybara.default_driver` is the headless,
JS-free `:rack_test` — plenty for what these 3 files actually do (`visit`, `fill_in`, `click_on`,
text assertions; no JS interaction). The fix is exactly the DSL swap already scoped here: drop
`feature`/`scenario`/`must_have_content` for plain `test "..." do` + `Capybara::Minitest::Assertions`
(`assert_text`/`assert_no_text`), and make sure whatever base class is used actually exposes route
helpers and a configured `Capybara.app` — right now nothing in `test/test_helper.rb` sets that up
(only `require "minitest/rails/capybara"`), so this still needs someone to wire up the Rails/Capybara
integration properly, not just rename a few methods. Left alone here rather than risk a fix that
"passes" without actually driving requests through the app. Two of the three files
(`can_create_user_test.rb`, most of `can_sign_in_test.rb`) have all their `scenario` bodies already
commented out, so the real payoff of fixing this is small until someone also writes the tests back in.

No CI currently runs either test suite (see `.github/workflows/`, which only has an auto-release
workflow) — that's part of why this drifted this far without being noticed.

## Frontend dependencies: major-version bumps still pending

Surveyed 2026-08-27 (`yarn outdated`, each entry checked individually). Much of the original list
was cleared by `feat/bump-shakapacker` (2026-09-05): the whole webpack + babel + postcss build
toolchain was replaced by rspack + swc, React went 16 → 17, `react-final-form` / `final-form` /
`react-dropzone` / `react-email-editor` / `isomorphic-dompurify` were bumped across their majors,
and `@wojtekmaj/react-daterange-picker` / `dayjs` / `rc-time-picker` / `react-csv` /
`react-datepicker` / `react-yearly-calendar` / `tui-code-snippet` were removed. What's left:

**React 17 → 19** — `react`/`react-dom` now at 17 (via `feat/bump-shakapacker`). Two majors still to
go, crossing real breaking boundaries:
- Legacy string refs (`ref="foo"`) and the legacy context API (`contextTypes`/`getChildContext`) are
  both removed in 19 — need to grep the ~118 class components (see `docs/I18n-Roadmap.md`'s context
  count) for both before attempting this.
- `ReactDOM.render` is gone from 18+ in favor of `createRoot`. `react_ujs` (currently `^2.4.3`, latest
  3.3.1) needs bumping in lockstep — it already tries to resolve `react-dom/client` internally
  (`node_modules/react_ujs/react_ujs/src/reactDomClient.js`).
- React 18 also changed effect/StrictMode timing enough to surface latent class-component lifecycle
  bugs that never showed up under 16/17's behavior.
- Stage it 17 → 18 first, prove it out, then 18 → 19.
- `@testing-library/react` is deliberately pinned at `^12.1.5` — RTL 13+ needs React 18+. Bump it
  when React moves past 17 (latest is 16.3.2).

**Downstream of the React bump** (pinned below latest; bumping before React itself is mostly churn):
`react-select`, `react-table`, `react-toastify`, `react-loader-spinner`, `react-autosuggest`,
`react-switch`.

**Independent of React, each a real API-surface jump**:
- `sweetalert2` 7.33.1 → 11.26.25 — dropped the old callback-based `swal({...})` API for promises
  somewhere in the 9.x line; every call site (dozens, via `frontend/tools/api.js` and components
  directly) would need reviewing.
- `bootstrap` 4.6.2 → 5.3.8 — drops the jQuery dependency, markup/class changes. (`feat/bump-shakapacker`
  briefly dropped `bootstrap` from `package.json` while `PresenceSheet.jsx` still `import`ed it,
  which pulled in a transitive `bootstrap@3` — restored to `^4` in `f7c9b92`.)
- `prettier` 1.19.1 → 3.9.6 — different default formatting rules; bumping would reformat large parts
  of the codebase in one commit.

**Build tooling**: `shakapacker` is at 9.3.0 (target was 10 — one more major).

**Smaller/isolated, lower priority**: `jquery` 3.7.1 → 4, `sass-loader` 16→17.

**Node** is at 22 (`feat/bump-shakapacker`), which unblocks `jsdom` 26→30 (had required Node ≥22) —
still a pending major bump, just no longer gated.

## Exotic (git-pinned) dependencies need a per-package decision, not a version bump

4 dependencies resolve to a git ref rather than a registry version (`yarn outdated` calls these
`exotic` and can't give a real "how far behind" comparison): `jQuery-QueryBuilder`,
`jQuery-QueryBuilder-Elasticsearch`, `react-stepzilla`, `tui-calendar`. None are pinned to a
commit SHA (branch/tag refs instead), so each can change underneath the app with zero
`package.json`/lockfile signal. (`react-yearly-calendar` was on this list — it was dropped by
`feat/bump-shakapacker`, which reimplemented `YearlyCalendar.jsx` on `@fullcalendar/react`.)

For each one the real question isn't "bump the version" but: why was it forked, is the fork's patch
still needed, is upstream (or the fork itself) still maintained, and does it make more sense to
un-fork (go back to a pinned upstream release), patch-and-pin (keep the fork but pin it to an exact
commit), or replace the library entirely. Researched 2026-08-27 via `gh api` (fork metadata +
`compare` between fork and upstream default branches) — one at a time, starting wherever the
maintenance risk is highest:

- **`tui-calendar`** (`SIXMON/tui.calendar` fork of `nhn/tui.calendar`) — **highest effort to
  reconcile**. Upstream is healthy and active (12.7k stars, pushed 2024-06, 208 open issues) but the
  fork is **1426 commits behind** it and has **14 commits of real, app-specific behavior** on top
  ("Changes to conform to ziggy data model" x2, plus scheduling-precision tweaks: 15-minute steps,
  minimum schedule duration, "nearest thresholds", drag constants). This isn't a trivial patch that
  could just be dropped — the app's actual calendar behavior depends on it. Un-forking means
  re-implementing all 14 commits' behavior against a version 1426 commits newer; worth scoping
  carefully before starting.
- **`react-stepzilla`** (`SIXMON/react-stepzilla` fork of `newbreedofgeek/react-stepzilla`) — upstream
  is alive but slow (615 stars, last pushed 2022-12). Fork has 3 real commits ahead (nav-state bug
  fixes for dynamic step counts) and is only 2 commits behind — the smallest gap of the forks here,
  and the patches look like legitimate upstreamable bug fixes rather than app-specific behavior.
  Reasonable candidate to try upstreaming the fix and dropping the fork.
- **`jQuery-QueryBuilder`** (`SIXMON/jQuery-QueryBuilder` fork of `mistic100/jQuery-QueryBuilder`) —
  upstream is actively maintained (1.7k stars, pushed 2024-11). Fork is trivial: 1 commit ahead ("Add
  span to input labels"), 48 commits behind. Lowest-risk candidate to just drop the fork and go back
  to a pinned upstream release, possibly re-adding the one small patch if still wanted.
- **`jQuery-QueryBuilder-Elasticsearch`** (`piotch/jQuery-QueryBuilder-Elasticsearch`) — not a fork of
  anything (independent project, no parent repo). Abandoned since 2016 (5 open issues, no activity
  since). No drop-in replacement found via a quick search — this one may need to be vendored/inlined
  or reimplemented in-house rather than either "un-forked" or swapped for an alternative package.

Whatever the per-package decision, pin to an exact commit SHA (or a real npm release) rather than a
branch ref in the meantime — that alone removes the "can silently change under us" risk even before
the fork-vs-replace decision is made.

## `devise/passwords/edit.html.erb` may be an orphaned view

Found 2026-08-27, same investigation. The reset-password link Devise's own flow sends
(`send_reset_password_instructions`) is rendered by `DeviseMailer#reset_password_instructions`
(`app/mailers/devise_mailer.rb`), and its email template builds the link with `edit_password_url`
(a custom top-level route, `/u/edit_password` → `UsersController#edit_password`) — not
`edit_user_password_url`, the Devise-generated route (`/u/password/edit` →
`PasswordsController#edit`, inherited unmodified from `Devise::PasswordsController`) that actually
renders `app/views/devise/passwords/edit.html.erb`. No `edit_user_password_path`/`_url` call exists
anywhere in `app/` (grepped `app --include="*.rb" --include="*.erb"`). It's possible some
DB-stored `NotificationTemplate` (Liquid/WYSIWYG content, outside static grep's reach — see
`docs/I18n.md`'s "hors périmètre") links to it, so this isn't confirmed dead the way the deleted
`.mjml` templates were. Checked the local dev/test DB directly (`NotificationTemplate.where("body
ILIKE ?", "%edit_password%")` and similar for `password/edit`/`edit_user_password`) — zero matches,
but that DB only has 1 seed row, so this doesn't rule out a production `NotificationTemplate`
referencing it. Still worth a production-data check before deleting this view.

## Rubocop backlog

`rubocop` was added as a Gemfile dependency 2026-08-26 but had never actually been run to completion
against this codebase. A dedicated cleanup pass (`chore/rubocop-backlog-cleanup`, 2026-09-12) brought
the count from 8255 offenses (681 files, 7001 auto-correctable) down to **1650 offenses in 568
files**, via `bundle exec rubocop -a` (safe autocorrect only — never `-A`) across the whole repo
(`app/`, `db/`, `config/`, `lib/`, `bin/`, both `spec/` and `test/`). Full RSpec suite was run before
and after: same 257 examples / 3 pre-existing failures both times (the documented
`devise_mailer_spec.rb` and `locations_destroy_spec.rb` flakes below) — no regressions from the
autocorrect. A sample of ~20 changed files across models/controllers/services/mailers/specs was
manually diffed to confirm each change was a genuine no-op (indentation, quoting, hash syntax, etc.);
all 86 `Lint/UselessAssignment` removals were individually checked to confirm the removed variable was
genuinely dead and any side-effecting right-hand-side expression (e.g. `level = self.levels.create!
(...)`, `pgr = ActiveRecord::Base.connection.execute <<-SQL`) was preserved by the corrector rather
than deleted along with the assignment.

Two categories were deliberately left uncleaned rather than blindly accepted:

- **`Style/Documentation` — disabled** in `.rubocop.yml` (was 443 offenses, not auto-correctable).
  This cop demands a comment above every class/module, which conflicts with this repo's established
  convention of writing no top-level doc comments unless the *why* is genuinely non-obvious.
  Bulk-adding boilerplate documentation comments to satisfy the cop would have been noise, not a
  cleanup.
- **`Style/FrozenStringLiteralComment` — left as-is** (488 offenses, *unsafe* correctable). Adding
  `# frozen_string_literal: true` to a file freezes every string literal in it, which can turn
  existing in-place mutation (`x = "foo"; x << "bar"`) into a runtime `FrozenError`. Auditing 488 call
  sites for this is a real, separate task, not something to batch under a "safe" pass. The cop itself
  is not disabled — it's a legitimate goal, just not safely automatable today.

What's left (1650 offenses, `bundle exec rubocop` final count) breaks down as:

- 488 `Style/FrozenStringLiteralComment` (see above).
- 488 `Layout/LineLength`. Nominally "safe correctable," but rubocop's line-length corrector can only
  reflow lines it can mechanically split (long method chains, hashes, etc.); the original 724 dropped
  to 488 as a side effect of the pass, and the rest need a human call on how to wrap them.
- ~674 more spread across cops needing real code changes rather than reformatting —
  `Style/OptionalBooleanParameter` (106), `Naming/VariableName` (79), `Naming/AccessorMethodName` (41),
  a long tail of *unsafe*-correctable style cops (`Style/RedundantInterpolation`, `Style/SymbolProc`,
  `Style/NumericPredicate`, `Style/SafeNavigation`, etc. — correctable only via `-A`, which this pass
  deliberately didn't run). None of these were touched in this cleanup — left for a future, more
  surgical pass.
- `Lint/DuplicateMethods` (3), `Lint/MissingSuper` (6), `Style/ClassVars` (11) — case-by-case
  triaged and resolved 2026-09-13 (`chore/lint-tail-triage`), see "Rubocop backlog: `Lint`/`Style`
  case-by-case triage" below. All 20 sites were fixed or explicitly documented; none left as bare
  offenses.
- 17 `Lint/Syntax` offenses, all in a single file:
  `lib/generators/elvis_plugin_model/templates/migration.rb`. This is a Thor/Rails generator ERB
  template (`<%= %>` tags) that happens to have a `.rb` extension; it was never valid standalone Ruby
  and rubocop can't parse it as such. Pre-existing, unrelated to this cleanup, not a real offense.

### Rubocop backlog: `Lint`/`Style` case-by-case triage (2026-09-13)

Follow-up to the safe-autocorrect pass above, on the three cops it deliberately left for
case-by-case review. Fresh count matched the stale one exactly (3/6/11, 20 sites total,
`chore/lint-tail-triage`). All 20 were resolved — none left as bare, undocumented offenses.

**`Lint/DuplicateMethods` (3/3 fixed)** — all three were "identical definitions" cases: no
behavior change, the surviving (already-running) definition was kept and the dead earlier one
removed.
- `User#activity_application` (`app/models/user.rb`): defined twice, both from the same squashed
  "initial commit" (no real history to compare) — `find_by(season: Season.current)` vs.
  `find_by(season_id: Season.current.id)`, semantically identical ActiveRecord calls. Removed the
  first (dead) definition. Regression spec: `spec/models/user_activity_application_spec.rb`.
- `Elvis::MenuManager::MenuItem#url` and `#position` (`lib/elvis/menu_manager.rb`): both were
  actually an `attr_reader` entry immediately shadowed by an explicit `def url`/`def position` a
  few lines below (also present since the same initial commit) — the attr_reader-generated readers
  never ran. Removed `:url`/`:position` from the `attr_reader` list; the custom methods (unchanged)
  are now the only definitions. Regression spec: `spec/lib/menu_manager_menu_item_spec.rb`.

**`Lint/MissingSuper` (6/6 documented, none needed a code fix)** — all six are
`LiquidDrops::*#initialize` overriding `Liquid::Drop#initialize`
(`app/mailers/liquid_drops/{activity_drop,activity_instance_drop,application_drop,dynamic_drop,
json_drop,payment_drop}.rb`). `Liquid::Drop#initialize` only does `@context = nil`; Liquid's own
`Context#find_variable`/`VariableLookup#lookup` always assign `drop.context = context` on every
drop before any drop method that reads `@context` (`liquid_method_missing`) runs, and an unset
ivar already reads as `nil` — so skipping `super` here is a genuine no-op, not a bug. Added
`# rubocop:disable Lint/MissingSuper` with a one-line rationale on each `initialize` rather than
leaving a bare offense. Existing `spec/mailers/*` coverage (activity_assigned_mailer_spec.rb,
application_mailer_notify_new_application_spec.rb, application_drop_spec.rb, i18n_p6_mailers_spec.rb)
exercises these drops end-to-end and still passes — no new test needed for a disable-comment-only
change.

**`Style/ClassVars` (11/11 fixed)** — all eleven were runtime-mutated `@@` variables, but in every
case the owning class/module has no subclasses and (for the two modules) is never
`include`d/`extend`ed elsewhere, so the cross-hierarchy-sharing risk the cop warns about was never
actually live. All converted to class instance variables with identical semantics (verified via new
regression specs, full RSpec suite, and manual trace of every call site):
- `Plugin.@@used_partials` → `Plugin.used_partials` (`class << self; attr_accessor
  :used_partials; end`) — `app/models/plugin.rb`. No subclasses of `Plugin`. Spec:
  `spec/models/plugin_used_partials_spec.rb`.
- `EventHandler.@@semaphore` → `@semaphore` (plain class instance var, read/written only from
  `EventHandler`'s own class methods) — `lib/elvis/event_handler.rb`. No subclasses. Spec:
  `spec/lib/event_handler_spec.rb`.
- `Elvis::Hook.@@listener_classes`/`@@listeners`/`@@hook_listeners` → `@listener_classes`/
  `@listeners`/`@hook_listeners` — `lib/elvis/hook.rb`. `Elvis::Hook` is a plain module used only
  through its own `class << self` methods; `Elvis::Hook::Listener` subclasses call back into it via
  `Elvis::Hook.add_listener`, they don't share its variable scope, and nothing `include`s/`extend`s
  `Elvis::Hook` itself. Spec: `spec/lib/elvis_hook_spec.rb`.
- `Elvis::MenuManager.@@menus` → `@menus` — `lib/elvis/menu_manager.rb`. Same shape as
  `Elvis::Hook`: a plain module, only ever called via `self.`-prefixed methods, never
  included/extended. Spec: `spec/lib/menu_manager_menus_spec.rb`.

No genuine runtime bug was found among these 20 sites — all three cops were flagging
latent/theoretical risk (dead shadowed code, a harmless skipped `super`, and a footgun pattern
that wasn't actually being triggered by any real subclass/inclusion in this codebase), not an
active defect. Full RSpec suite: 294 examples / 0 failures after the fix (257 baseline + 21 from
a prior batch + 16 new specs added here). `bundle exec rubocop --only
Lint/DuplicateMethods,Lint/MissingSuper,Style/ClassVars` reports 0 offenses for app/lib code
(only the pre-existing, unrelated `lib/generators/elvis_plugin_model/templates/migration.rb`
`Lint/Syntax` noise remains, as documented above).

## Scaffold views suspected dead — recovery log + removal candidates

Surfaced 2026-08-28 across the i18n-06 evaluation + payments work. Several admin CRUD `resources :x`
declarations have `show`/`create`/`update` routes whose controller actions either don't exist or
`redirect_to`/`render json:` unconditionally, so the matching Rails-scaffold view stubs
(`<h1>X#show</h1>` / `<p>Find me in ...</p>` / 0-byte) look unreachable.

**A 500 (`AbstractController::ActionNotFound`) or an unconditional redirect does NOT prove the
route is unused.** This app prepends plugin routes *before* its own (`CLAUDE.md` → plugin system:
"plugin routes are deliberately prepended ... so plugins can override core behavior"), so an
activated plugin can supply a real `show`/`update` that never appears in `app/`. Add `rescue_from`,
`method_missing`, `respond_to` fallbacks, external API callers, and bookmarked URLs, and "returns
500 in my local checkout" is weak evidence. Treat everything below as *unconfirmed* and prefer
recovery over deletion until someone audits plugins + prod logs.

### Already deleted (recover if in doubt)

- `app/views/evaluation_level_ref/create.html.erb`, `app/views/evaluation_level_ref/update.html.erb`
  — deleted in `feature/i18n-06-extract-evaluation` (commit `48a6208`, now merged to `develop` via
  `4a32bac`). Reason given at the time: `create`/`update` `redirect_to` unconditionally.
  **Recover with** `git show 48a6208^:app/views/evaluation_level_ref/create.html.erb`
  (and `...update.html.erb`).

### Not deleted — left in place, flagged for a later audit

- `app/views/evaluation_level_ref/show.html.erb` — empty `def show; end` still renders it.
- `app/views/payment_statuses/show.html.erb` (0 bytes) — no `show` action on
  `PaymentStatusesController`; `resources :payment_statuses` still routes `GET /payment_statuses/:id`.
  Was briefly deleted in `feature/i18n-06-extract-payments`, then **restored** per the
  recover-don't-delete policy.
- `app/views/due_payment/update.html.erb` — `DuePaymentController#update` does `render json:`
  unconditionally. Same: briefly deleted in that branch, then restored.
- `payment_method` also has no `show` action while `resources :payment_method` routes `show`.
- `app/views/activity_ref/{create,update}.html.erb` — 85-byte Rails-scaffold stubs
  (`<h1>ActivityRef#create</h1>`). `ActivityRefController#create`/`#update` always `render json:`,
  so unreachable. Left untouched by i18n-06 activities lot 1.

When someone picks this up: audit activated plugins' route files and prod request logs for these
paths first; only then drop the dead actions/views and tighten the route declarations with
`only:`/`except:` in `config/routes.rb`.

## i18n PRs #7–#10 never got a specialized code-review pass

The first few i18n extraction PRs (#7 `extract-users`, #8 `extract-evaluation`, #9
`extract-payments`, #10 `common-react-table-keys`) were reviewed inline only (diff read + test
suites + key-parity check), before the process changed to route every i18n PR through the
specialized `code-reviewer` agent (from PR #11 onward, followed ever since). Backfilling a
specialized pass on these four is still open but low priority — every one of them has since been
re-touched, tested, and reviewed by several later lots, so a fresh full-codebase review is more
useful than re-reviewing an isolated 2026-08 diff in isolation.

## `planning/Calendar.jsx` — tui-calendar strings frozen at mount

Surfaced 2026-08-30 during the i18n-06 planning lot 3b (`Calendar.jsx`) extraction. The dead
`ConflictDisplayItem` component this section used to also flag was deleted (it was referenced only
from inside a commented-out JSX block, so it never rendered — no plugin risk on this fork, so no
"recover, don't delete" caveat applies; see `README.md`'s "Removed dead code" section).

- `week.daynames` is passed to the `tui-calendar` constructor once in `componentDidMount` (a
  frozen array), and the `monthGridHeaderExceed` / `weekDayname` template functions capture the
  mount-time `t`. So after an in-page `i18n.changeLanguage`, the day-name headers, "N autres"
  and "Présences" stay in the old language while `CalendarControls` (fresh `t` each render) and
  the `time:` schedule-title template (reads `this.props.t`) switch. Same class as the
  generalPayments "column headers frozen at construct time" note below, and harmless for the
  same reason: `LocaleController#update` does a full server reload, so no calendar instance
  outlives a locale change. Fix (if it ever matters) = destroy + recreate the tui-calendar
  instance on `languageChanged`.

## generalPayments tables freeze translated column headers at construct time

`DuePaymentList.jsx` and `PaymentList.jsx` (and the smaller `PaymentScheduleList` filter setup)
build their react-table `columns` array — each `Header: t(...)` — in the **constructor**, using the
mount-time `t`, and store it in `this.state.columns`. `render()` reads `this.state.columns`, so the
headers (and `state.message.title`, seeded from `t("general.reminder.defaultTitle")`) never
re-derive when i18next fires `languageChanged`.

This is **currently harmless**: the language switcher (`LocaleController#update`) does a full
server-side PATCH + redirect, so every React island is re-mounted in the new language and no
component lives across an in-page language change (confirmed by the specialized reviews of PR #11
and PR #12). It becomes a real bug the moment anything calls `i18n.changeLanguage(...)` in-page, or
a second locale-aware island renders on the same page in a different language.

Fix when it matters: move the `columns` build into `render()` (as was done for
`SubPaymentList.jsx` in lot 2a) — the Filter/Cell closures already close over `this`, so it's
mechanical but touches ~200 lines in each 1000+-line file, hence deferred.

Same pattern (added by i18n-06 activities lot 1): `activities/ActivityRefKind.jsx` and
`activities/Instruments.jsx` build `this.state.columns` with `this.props.t(...)` `Header`s in the
constructor. Harmless for the same reason (full-reload locale switch); `BaseDataTable` reads
`this.state.columns` so moving the build needs the same care.

Same pattern again (added by i18n-06 `parameters` lot A): the settings-area chrome resolves its
strings once and never re-derives on `languageChanged` —
- `parameters/BaseDataTable.jsx` reads the bare `i18n` singleton (`i18n.t("common:actions.create")`
  + the 7 `common:reactTable.*` props) — it can't be `withTranslation`-wrapped because ~15 CRUD
  tables `extends BaseDataTable`.
- The 5 class tab-wrappers (`Community`/`Rooms`/`Evaluations`/`Payments`/`Practice` `*Parameters.jsx`)
  build `this.state.tabsNames` from `props.t(...)` in the **constructor**; `BaseParameters.render()`
  reads `this.state.tabsNames`.
Harmless for the same full-reload reason. Fix alongside the rest of this section.

Same pattern again (added by i18n-06 `parameters` lot B): the 7 `parameters/Practice/*.jsx` CRUD
tables (`BandsType`/`Features`/`FlatRate`/`Groups`/`Instruments`/`Materials`/`MusicGenres`) build
`this.state.columns` with the constructor's `t` (`Header: t("practice.cols.*")`), and their boolean
`Cell` closures capture that same construct-time `t` for the `t("practice.yes"/"no")` render.
Extra wrinkle unique to lot B: `deleteStatus()` reads `this.props.t` (live), so an in-page
`changeLanguage` would give a **mixed-language** table — frozen French column headers next to an
English delete-confirm dialog. Still harmless today (full-reload locale switch), logged for the
same cleanup pass.

Same pattern again (added by i18n-06 `parameters` lot C): `parameters/Payments/PaymentsMethods.jsx`
and `parameters/Payments/PaymentsStatus.jsx` — two more `extends BaseDataTable` tables that build
`this.state.columns` with the constructor's `t` and capture it in their boolean `Cell` closures,
with the same live-`this.props.t`-in-`deleteStatus` mixed-language wrinkle as lot B.

Same pattern again (added by i18n-06 `parameters` lot E):
- `parameters/Evaluations/EvaluationLevels.jsx` (`extends BaseDataTable`) and
  `parameters/Rooms/Localisations.jsx` (`extends React.Component`, own `<ReactTable>`) build
  `this.state.columns` with the constructor's `t` and capture it in the boolean `Cell` closures;
  both also read a live `this.props.t` in `deleteStatus` — same mixed-language wrinkle.
- **New variant:** `Localisations.jsx` `render()` reads live `this.props.t` for the 7
  `common:reactTable.*` pagination props while `state.columns` stays frozen from the constructor.
  So an in-page `changeLanguage` on that table would show three states at once — frozen French
  column headers, live-translated pagination chrome, live-translated delete dialog. First lot with
  a live `render()` reader sitting next to frozen `state.columns`.
- Mount-time `t` captured in api callbacks (same class as the lot-D entry further down): the
  `useTranslation` `t` closed over by the mount `useEffect` `.error` handlers in
  `Plannings/SchoolAvailabilities.jsx`, `Plannings/CancelActivityParameters.jsx`,
  `Plannings/PlanningDisplayParameters.jsx`, and `Localization/LocalizationParameters.jsx`.
All harmless today (locale switch = full server reload); logged for the same cleanup pass.

## Locale-file verbatim typos — reference notes (catalogue resolved)

The extraction-era catalogue of preserved-verbatim French defects was corrected across
`feature/i18n-typo-cleanup` (PR #51), `feature/i18n-parameters-shared-consolidation` (PR #52), and
`fix/known-issues-easy-batch`. The notes below are the parts still worth keeping.

**Load-bearing whitespace — do not let a future normalize/trim pass touch these.** Each carries a
leading and/or trailing space that is concatenation glue at its call site, or wraps intentional
inline HTML:
- `planning:activityModal.createCoursesButton` / `createCourseButton` (trailing space before the
  next inline element) and `activityModal.teacherChangeWarningLabel` (trailing space, `<b>` prefix).
- `common:messages.errIsInvalidId` (trailing space before the `<button>` rendered right after it
  in `UserForm.jsx`'s redirect toast).
- `activityApplications:summary.reasonForRefusal` / `summary.memberNumber` (leading/trailing space,
  concatenated next to a value at the call site).
- `activityApplications:wizard.applicationSubtitle.{allActivities,oneActivity}` — leading-space-only
  fragments concatenated into `applicationSubtitle.full`; adding a trailing space would double the
  gap in the rendered `<h3>`.
- `courses:lessonList.help.body`, `activityApplications:wizard.submit.applicationRegisteredHtml`,
  `activityApplications:addPreApp.confirmHtml` — literal `<br/>`/`<p>`/`<b>`/`<h5>` HTML rendered by
  sweetalert2 or `dangerouslySetInnerHTML`; the tags are intentional, not markup that leaked in.
- `parameters:editParameters.school.activitiesNotVatLabel` is a `<Trans>` key using the indexed
  `<1>…</1>` form (`u` is not in react-i18next's default `transKeepBasicHtmlNodesFor`) — `<1>` must
  stay `<1>` in both locales.

**Non-typo behaviour notes still relevant:**
- The `const T = (k, o) => i18n.t(...)` helper used by StepZilla steps (`UserSearch.jsx`,
  `WizardUserSelectMember.jsx`, and `TimeIntervalPreferencesEditor.jsx`'s nested `Availability`
  class) re-reads the singleton per call but doesn't subscribe to `languageChanged`, so these
  components don't re-render on an in-page `i18n.changeLanguage()`. `UserSearch`'s one `<Trans>`
  line *does* subscribe, so a live switch would briefly show one line in the new language while the
  rest stays in the old one. Harmless while the locale switch is a full server reload — same class
  as the frozen-at-construct section above.
- Plural keys with no non-plural fallback: `activityApplications:formulaActivitiesModal.{maxSelectable,
  selectToValidate, selectAmong}` are `_one`/`_other` only — `t(key, {count: undefined})` renders
  the raw key string. Not currently reachable (`Formule#number_of_items` is always present), but
  keep that attribute in any future serializer `as_json only:` list.
- The level sentinel `activityApplications:summaryActivity.notSpecified` mirrors the **raw** French
  string a `===` comparison checks elsewhere (`LevelCell`) — correct as-is; don't translate the
  comparison literal itself in a future refactor.
- For any new `<Trans>` key: react-i18next's default `transKeepBasicHtmlNodesFor` is
  `["br","strong","i","p"]` — `em`/`a`/`u` are not in it. Use the indexed `<1>…</1>` form.

Non-i18n code bugs still open, surfaced while extracting these files (none are locale-file defects):
- `parameters/Payments/AdhesionSettings.jsx` / `AdhesionEditModal.jsx`: `initialValues.label`
  defaults to the translated string `t("payments.adhesion.modal.defaultLabel")`. If an EN-locale
  admin leaves the field untouched, that literal English string gets POSTed and persisted as data —
  a UI-string-as-data smell that should be an explicit server-side default, not a client i18n key.
- `editParameters/SchoolParameters.jsx` — a bad email now correctly blocks submit
  (`fix/wrong-property-refs` switched `pattern: validateEmail` → `validate:`), but a malformed
  non-empty address renders the `emailRequired` copy ("L'email est requis"). Same shape as the
  sibling `contactPhone` field. A dedicated `parameters:editParameters.school.emailInvalid` key
  would fix the copy — parameters-domain follow-up.

Reference — dedup opportunities intentionally not touched (each pair is a distinct source literal
under the verbatim policy, not a bug): `activityChoice.*`/`formulaChoice.*`/
`selectedActivitiesTable.*`/`validation.col*` in `activityApplications.json` all redeclare the same
"Récapitulatif"/"Durée"/"Tarif estimé"/"Rechercher" concepts per-component; the "no activity
selected" concept has three near-duplicate keys across `activityChoice`/`formulaChoice`/
`validation`. A shared `activityApplications` sub-block would fold these — not attempted here to
avoid restructuring ad hoc across an already-merged domain.

## `activityApplications` — small untranslated unit tokens

Surfaced during the i18n-06 activities lot-3a review; the `noIntervalMessage`/`tooltip` override,
the `Validation.jsx` `<h3>` headings, and all three duration formatters
(`SelectedActivitiesTable.jsx`, `FormulaActivitiesModal.jsx`, `Activity.jsx#displayDuration`) are
now translated and consistent — via `activityApplications:units.{minutes,hoursMinutes}`, with
`units.minutes` standardized to `"{{minutes}} min"` (spaced). What's left, low priority:

- `frontend/tools/constants.js` `TIME_STEPS` still has hardcoded labels (`"1h"`, `"45min"`,
  `"30min"`, `"15min"`) — a 4-element const array left out of the constants-i18n pass, and now
  also inconsistent with the spaced `activityApplications:units.minutes` convention above.
  Belongs in the roadmap Phase 07 planning/activity area (needs new fr+en keys → a `translator`
  pass), not a bug batch.

## `courses/LessonList.jsx` — remaining frozen-at-construct-time string

`message.title` defaults to `i18n.t("courses:lessonList.messageDefaultTitle")` evaluated in the
**constructor**, so it's frozen at construct time and won't follow a later `changeLanguage`
(harmless — a locale switch is a full server reload; same class of issue as the
generalPayments/`planning/Calendar.jsx` frozen-header notes above). The 12 react-table column
headers are fine — they're rebuilt inside `render()`. (The Started/Stopped-dates,
level-column and day-column issues previously logged here are all resolved — a
`Intl.DateTimeFormat(i18n.language, { timeZone: "Europe/Paris" })` fix, planning lot 3c, and a
`moment.locale("fr")` removal, respectively — see the timezone note below for why the `timeZone`
option matters.)

## Frontend date formatting hardcodes `Europe/Paris` — not per-installation configurable

`courses/LessonList.jsx` and `activityApplications/summary/Activity.jsx` format `begin_at`/
`stopped_at` with an explicit `timeZone: "Europe/Paris"` option (each in its own
`PARIS_DATE_FORMAT_OPTIONS` constant), fixing a real bug: those fields are Paris-zone timestamps
at local midnight (`config.time_zone = "Paris"`, `config/application.rb:50`), and formatting them
without an explicit `timeZone` uses the *browser's* zone instead — silently rolling the displayed
date back a day for anyone west of Paris (found by the code-reviewer retroactively auditing PR
#66, which had introduced the locale-aware formatting but not the timezone fix).

Hardcoding `"Europe/Paris"` fixes today's single-tenant deployment but doesn't generalize: if Elvis
is ever installed for a school outside the Paris timezone, both the backend
(`config.time_zone = "Paris"`) and now these two frontend constants would need to become a
per-installation setting (see the `Parameter`/`Settings` pattern in `CLAUDE.md`'s Multi-tenancy
section) rather than a source-code constant. Not fixed here — flagging so it doesn't silently
duplicate the day-off-by-one bug in reverse (Paris-vs-installation mismatch) once/if the app is
ever deployed outside France.

## `frontend/tools/constants.js` — constants-i18n leftovers

The `WEEKDAYS`/`MONTHS`, `MESSAGES`/`API_ERRORS_MESSAGES`, and
`KINDS_LABEL`/`PRE_APPLICATION_ACTION_LABELS`/`RECURRENCE_TYPES` French constants were moved to
`common:*` namespaces across constants-i18n lots 1–3 (`export let` live bindings + `languageChanged`
re-read). Two things left:

**Dedup (not a defect):** `common:kindsLabel` now duplicates `planning:kinds` in both locales
(Cours/Course, Option, Évaluation/Evaluation). Fold into the cross-namespace consolidation backlog.

## `frontend/tools/format.jsx` — `toFullDateFr` is day-before-month regardless of locale

The month off-by-one bug (`toFullDateFr` feeding a 0-based `getMonth()` into the 1-based
`toMonthName`) is fixed — `format.test.js` now pins the full string, not just the weekday token.
One thing remains hardcoded: the word order itself is always `<weekday> <day> <month> <year>`
(French field order), even in English mode — `toFullDateFr(new Date(2026, 0, 12))` renders
"Monday 12 January 2026" rather than a US-style "January 12, 2026". Defensible given the function
name (`Fr` = French format, kept as one specific rendering), but flag it if this function's scope
ever grows beyond the create-activity modal date header (`planning/CreateActivityModal.jsx:67,112`,
its only consumer).

## `parameters` domain — remaining structural / dead-code items

The i18n-06 `parameters` domain (lots A–F, `feature/i18n-06-parameters-lot-*`) is functionally
complete, and its own verbatim-typo catalogue was folded into the "Locale-file verbatim typos"
section above — fully resolved as of `fix/known-issues-easy-batch`. `feature/i18n-parameters-shared-
consolidation` additionally folded every byte-identical `parameters:*` duplicate flagged across
lots A–E3 into a `shared.*` block (`parameters.json` 255 → 233 leaves) — `shared.colName`,
`shared.colLabel`, `shared.deleteStatusConfirm`, `shared.saveCompleted`, `shared.genericErrorShort`,
`shared.saveSuccessTitle`, plus folding three separate loading-title copies into `common:loading`.
A later fix moved `editParameters.dragAndDrop.*` out to `common:dragAndDrop.*` (233 → 227 leaves;
see `frontend/components/editParameters/DragAndDrop.jsx`).

What's still open in this domain:

- **Cross-namespace duplicate that can't be folded into `shared.*`**: the "no level set" concept
  has three separate keys, one per namespace — `activityApplications:summaryActivity.notSpecified`,
  `courses:lessonList.userRow.notSpecified`, `planning:levelDisplay.notIndicated` (all "NOT
  SPECIFIED" in EN). `shared.*` lives inside `parameters.json`, so it can't reach across namespaces.
- **Possible dead code** (do not delete — recover-don't-delete policy): `parameters/Rooms/
  RoomsParameters.jsx` isn't mounted by any core view (`rooms_parameters/index.html.erb` mounts
  `Rooms/Localisations` directly); its only key is exercised solely by the parity test.
  `editParameters/FormulesParameters` is referenced by
  `formules_parameters_edit.html.erb`'s `react_component` call but **the component file doesn't
  exist** under `frontend/components/editParameters/` — likely a dead route or a plugin-provided
  component. Audit against activated plugins / prod logs before touching either.
- **Mixed-language side effect of planning lot 3c, `KindLegend` half resolved by constants-i18n
  lot 3**: `SimplePlanning.jsx` renders `<KindLegend>` right below the level line lot 3c
  localized — `tools/constants.js` `KINDS_LABEL` now follows the active language too (lot 3), so
  that particular mismatch is gone.

Design note (`planning/TimeIntervalHelpers.jsx`, lot 3c — so a later reader doesn't "simplify" it):
`levelDisplay()` / `levelDisplayForActivity()` keep returning the raw French sentinels
(`LEVEL_NOT_INDICATED = "NON INDIQUÉ"`, `LEVEL_TO_SPECIFY = "À PRÉCISER"`, both exported constants)
so `===` call-site comparisons stay locale-stable; a separate `levelDisplayLabel(value)` localizes
only at render via `i18n.t("planning:levelDisplay.*")`, passing any real level label through
unchanged. Every call site was split into "compare" (use the constant) vs "display" (wrap in
`levelDisplayLabel`) — touched `Activity.jsx`, `LessonList.jsx`, `ActivitiesApplicationsList.jsx`,
`Calendar.jsx`, `SimplePlanning.jsx`, `RawPlanning.jsx`.

`frontend/components/planning/TimeInterval.jsx` was left untouched by lot 3c: its `levelDisplay()`
method is a stub (`return "Banana";`, the rest commented out) and it has its own separate hardcoded
`` `${averageAge} ans` ``. Broken legacy component, not extracted (don't-delete-on-looks-dead).

## `frontend/components/common/baseDataTable/BaseDataTable.jsx` — remaining minor items

All of the below refer to the **functional** shared data table under
`frontend/components/common/baseDataTable/`, not the older class-based
`frontend/components/parameters/BaseDataTable.jsx`. Its two sibling modals (`ItemFormModal.jsx`,
`DeleteItemModal.jsx`) were the subject of a "still hardcode their own chrome" entry here; that is
now resolved (`fix/known-issues-batch-4` wired both to `useTranslation("common")`).

Still hardcoded in `BaseDataTable.jsx` itself, deliberately left: the appended actions column's
`Header: "Actions"`. Impact is nil — the word is spelled identically in French and English — but
it is the one user-visible string in the file that does not go through `common:`.

Latent, `BaseDataTable.jsx`: `const tableName = "table-" + oneResourceTypeName` feeds a
`reactTableFullscreen${tableName}Change` custom-event name (`ReactTableFullScreen.jsx`), so a
previously-constant event name is now locale-derived. Dispatcher and listener stay consistent
within one page load, and `Coupons` passes `showFullScreenButton={false}`, so impact today is nil.

Latent, same file: the fetch-error message is resolved to a string and stored in state
(`errorMessage`), so a `changeLanguage` after a failed fetch leaves the previous language's message
on screen until the next fetch resolves. Same frozen-translation class as the `columns`/`daynames`
notes above, and harmless for the same reason (switching locale is a full server reload).


## Pre-existing bugs surfaced during Phase 07 P2 (practice/rooms/locations extraction)

- **`app/views/practice/bands/_form.html.erb` is dead** — `bands` new/edit mount React
  (`practice/BandCreator` / `practice/BandEdit`) and the `create`/`update` failure paths
  `render :new`/`:edit` land on those. Its bare `<%= form.submit %>` (no arg) would render the
  English Rails default "Create Band" if ever revived. Left in place (don't-delete-on-looks-dead);
  its `activerecord.attributes.band.*` keys stay reachable via `band.errors.full_messages`.

## Pre-existing bugs surfaced during Phase 07 P4 (activity-catalogue + member-facing ERB)

- **Rails scaffold placeholder views still present** (English `<h1>Model#action</h1><p>Find me in ...</p>`
  stubs, no route reaching them for a real render): `activity/remove.html.erb`,
  `activity_instance/{delete,update}.html.erb`, `activity_ref/{create,update}.html.erb`,
  `activities_applications/create.html.erb`, `comments/{create,update,destroy}.html.erb`,
  `time_interval/validate.html.erb`, `family_members/destroy.html.erb`,
  `family_member_users/destroy.html.erb`. Left in place (don't-delete-on-looks-dead); not extracted.

## Phase 07 P5 (React-tail extraction) — pre-existing bugs surfaced, and things deliberately left

- **`frontend/components/AttachAccount.jsx` `UserListItem` rendered a literal `${…}` in JSX text**
  (`Adhérent #${user.adherent_number}` inside a JSX text node — the template-literal syntax was
  never evaluated, so the UI showed a dollar-brace). Fixed while extracting: now
  `t("users:attachAccount.memberNumber", { number: user.adherent_number })`.
- **`frontend/components/WorkGroupTemplateEditor.jsx` (root-level `WorkGroupEditor`) is dead code.**
  It is superseded by the already-i18n'd `frontend/components/activityRef/WorkGroupTemplateEditor.jsx`
  (the only import site — `activityRef/ActivityRefContainer.jsx`), and is not mounted via any
  `react_component`. Left untouched (don't-delete-on-looks-dead); NOT extracted. Its broken sentence
  `"Aucun instrument sauvegardé Vous pouvez en suivant ce <a>lien</a>"` (missing punctuation/verb) is
  already fixed in the live `activityRef` copy's `activities:workGroup.noInstruments` key.
- **Constant-module label dictionaries NOT extracted in P5** (they read as id-constant / enum-value
  modules per the P5 exclusion list, and several feed backend-keyed comparisons):
  `frontend/components/utils/StopReasons.js` (`STOP_REASONS` — the stop-reason `<select>` options in
  `CurrentActivityItem` / `StopList`); `frontend/components/mailTemplates/MergeTags.jsx` (~35
  merge-tag `name`/`sample` pairs consumed by the WYSIWYG's `setMergeTags()`, where `name` may be a
  load-bearing key); `frontend/components/advancedSearch/utils.js` (a verbatim vendored
  jQuery-QueryBuilder French language pack + a `PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS` label
  array). Each is a candidate for a dedicated constants-i18n follow-up.
- **`frontend/components/utils/DateFilter.tsx` `RangedSelect` throws `"the arguments need to be
  integers"` under some props** (visible as loud stderr in the Vitest run, inside otherwise-passing
  tests). Investigated in `fix/known-issues-easy-frontend`: the only place this throw fires under
  the current Vitest suite is `DateFilter.test.jsx`'s own "throws its own explicit guard" test,
  which deliberately renders `<RangedSelect min="1" .../>` to assert the guard produces a clear
  message instead of a lodash `ReferenceError`. React 16 dev mode captures a real stack trace for
  errors thrown during render via a `dispatchEvent`-based trick (`invokeGuardedCallbackDev`), which
  always logs to console/stderr even though the test's `expect(...).toThrow()` correctly catches
  the error — so the "loud stderr" is React's own dev-mode logging of an intentional test case, not
  evidence of a real caller hitting this path today. `RangedSelect`'s two production callers
  (`DateFilter.tsx`'s own two internal uses, which run `min`/`max` through `moment(...).year()`
  first) are safe; `HoursSheet.jsx` calls `RangedSelect` directly with
  `max={this.props.maxYear + 1 || 2101}` / `min={this.props.minYear || 1975}`, which would trip the
  same guard if `minYear`/`maxYear` ever arrived as numeric strings rather than numbers — not
  currently reachable (`users_controller.rb`'s `@min_year`/`@max_year` come from `.year` on a Ruby
  `Date`, always an `Integer`), but a fragile implicit contract. Left as-is: `HoursSheet.jsx` isn't
  part of this item's listed scope, and hardening `RangedSelect`'s guard itself would conflict with
  the existing test that deliberately relies on it staying strict. Fold a `HoursSheet.jsx`
  `Number(...)` coercion into a future pass if `minYear`/`maxYear` ever start arriving as strings.
- **`frontend/components/{StopList,eventsRules/EventsRules,mailTemplates/TemplateIndex}.jsx` and
  a few others build react-table `columns` at module scope / in a plain `const` inside `render()`.**
  Where the array was module-level (`StopList`'s `TABLE_COLUMNS`), P5 converted it to a
  `getTableColumns(t)` factory called at render time, so headers follow the active locale. Where the
  array was already inside `render()` (`SeasonsList`, `PlanningList*`, `TemplateIndex`, `EventsRules`,
  `PackUtilization`), no change was needed — same rationale as the frozen-at-construct section above.
  `Holidays.jsx` had its `columns` class-field moved to a `getColumns()` render-time getter for the
  same reason.

## Pre-existing bugs surfaced during Phase 07 P6 (backend strings: mailers, controllers, models)

- **`RemoveController#get_references` never actually renders its return value over HTTP - the
  endpoint always responds `204 No Content`, regardless of the `display_name` bug fixed on
  `fix/remove-controller-display-class-name-i18n`.** Discovered while fixing that bug (see
  `app/models/application_record.rb`'s `display_class_name` and
  `app/controllers/remove_controller.rb:105`, now correct). The action
  (`app/controllers/remove_controller.rb`) computes and returns an array but never calls `render`,
  and there is no `app/views/remove/get_references.*` template. Rails'
  `ActionController::ImplicitRender#default_render` then falls through to `head :no_content` for any
  non-"interactive browser" request format (confirmed via a real `GET /references/:classname/:id` in
  a request spec, both before and after the display_name fix). Whether some plugin supplies the
  missing template at runtime in a real deployment (see `docs/Plugin-*.md`'s view-path prepending)
  could not be determined in this checkout, since no plugins are loaded here (`plugins.json` absent).
  This means either the endpoint is currently dead code with no HTTP consumer (no `frontend/**`
  caller of `/references/:classname/:id` was found either - see `RemoveComponent.jsx`, which only
  ever calls the plain `generic_destroy` delete route), or a plugin's template is doing the rendering
  in production. Left unfixed - adding a `render json:` call wasn't part of the two-bug fix this was
  found alongside, and could conflict with a plugin-supplied template if one exists. Flagging for a
  follow-up to determine which case applies and fix accordingly.
- **The seeded `label` columns on `PaymentStatus` / `DuePaymentStatus` / `ActivityApplicationStatus`
  / `PaymentMethod` / `EvaluationLevelRef` remain hardcoded French, deliberately out of scope for
  P6.** (`display_class_name` itself was converted to `model_name.human(count:)` on
  `fix/remove-controller-display-class-name-i18n`.) The seeded status/method `label` values
  (`"Validé"`, `"Echoué"`, `"En attente"`, ...) are still untranslated and still out of scope: they're
  DB rows created via `find_or_create_by!` at class load and are admin-editable at runtime (the
  settings UI lets a school add custom statuses/methods alongside the built-ins) — closer to
  `Parameter`/`NotificationTemplate` per-instance content than to static UI chrome.
## `StaticPagesController#landing`/`#about` and `AdminController`'s mail-settings view are unrouted dead code

Found 2026-09-12 while extracting strings for Phase 07 P7 (`feat/i18n-p7-oauth-legal-pages`).

- `app/controllers/static_pages_controller.rb` (`landing`, `about` actions) and their views
  (`app/views/static_pages/{landing,about}.html.erb`) have no matching entry anywhere in
  `config/routes.rb` — confirmed both by grepping the routes file for `landing`/`about`/
  `static_pages` (no hits) and by hitting `GET /about` in a `RAILS_ENV=test` integration session,
  which raises `ActionController::RoutingError: No route matches`. `app/views/layouts/
  static_pages.html.erb` (already localized in an earlier Phase 07 batch) still references
  `about_path`, which would itself raise `NoMethodError` if that layout were ever rendered, since
  no such route/path helper exists. Not fixed here (adding routes is a behavior change, not a
  string-extraction one) — flagging in case this layout+controller+views trio is either meant to be
  wired up (marketing landing page) or is safe to remove outright.
- `app/views/admin/edit_mail_settings.html.erb` (`views.admin.edit_mail_settings.*` after this PR)
  has no corresponding route or controller action either — `AdminController` has no
  `edit_mail_settings` method, and nothing in `config/routes.rb` references it. Its live
  equivalent is `ParametersController#mails_parameters_edit` /
  `app/views/parameters/mails_parameters_edit.html.erb` (already localized, `views.parameters.
  mails_parameters.edit.heading`), which renders the same `editParameters/MailSettings` React
  component. This file looks like a superseded leftover from before the `parameters` controller
  consolidation. Extracted its one hardcoded string anyway per the P7 task scope (mechanical
  audit of everything under `app/views/admin/`), but not deleted — per this repo's "don't delete
  on 500 / looks dead" policy, leave orphaned code for a human to confirm before removing.

Per the same P7 audit, `app/views/errors/base_renderer_error.html.erb` hardcoded the literal
English word `Error` (`<h2>Error <%= code %></h2>`) in a French-default-locale app — genuine
"English leaking into a French view", not a typo. Fixed as part of the extraction
(`views.errors.base_renderer_error.heading` is `"Erreur %{code}"` in `fr.yml`, `"Error %{code}"`
in `en.yml`) rather than left broken, since the whole point of moving it into `t(...)` is to make
it locale-correct; flagging here per the "don't silently fix semantic bugs" policy since it *is*
a wording/language change, not a typo/accent fix.

The same P7 pass silently fixed two more English-leak strings without flagging them per that
same policy — noting them here for consistency: `static_pages/about.html.erb`'s heading
("About Elvis" hardcoded in a French view) is now `views.static_pages.about.heading` =
"À propos d'Elvis" (fr) / "About Elvis" (en); `static_pages/landing.html.erb`'s link text
("Details »") is now `views.static_pages.landing.read_more` = "Détails »" (fr) / "Details »" (en).
Both are on the unrouted dead views above, so harmless in practice, but the fix pattern is
identical to `base_renderer_error`'s and should have been called out the same way.

## A new spec file's mere presence (not its content) flips an unrelated, pre-existing `spec/controllers/application_controller_spec.rb` example

Found 2026-09-12 while running the full `bundle exec rspec` suite after adding `spec/mailers/application_mailer_notify_new_application_spec.rb` (part of the `LiquidDrops::ApplicationDrop` fix above). Bisected by excluding files: with that one file excluded from a `spec/controllers spec/mailers spec/models spec/requests spec/services` run, all 229 examples pass (module the separate `formule_i18n_spec.rb` flake below); with it included, `spec/controllers/application_controller_spec.rb`'s `"falls back to I18n.default_locale when the localization settings lookup raises"` example fails — `response.body` (rendered while `Parameter.get_values` is stubbed to raise) comes back `"en"` instead of the expected `"fr"`. The file's own content doesn't touch `I18n`, `Parameter`, or `Elvis::SUPPORTED_LOCALES` at all (it exercises `ApplicationMailer#notify_new_application` against a plain `ActivityApplication`/`Season`/`School` fixture) — its mere presence in the file list is enough to change example ordering/timing elsewhere in the run and surface a **pre-existing** fragility, not something this file's code causes. Both the implicated example and `application_mailer_notify_new_application_spec.rb` pass individually and pass together with `spec/controllers spec/mailers` alone (54 examples, 0 failures) — the interaction needs something in `spec/models`/`spec/requests`/`spec/services` to also be present.

Not root-caused further here (would need the same kind of deep instrumentation as the migration issue above, and is unrelated to any of this batch's 6 scoped items). Given `resolve_locale`'s fallback path when `Parameter.get_values` raises hardcodes `I18n.default_locale.to_s` as the `default_language` candidate and `Elvis::SUPPORTED_LOCALES` (`%w[fr en].freeze`, `fr` first) as `available_languages`, the observed `"en"` result implies either `I18n.default_locale` or the effective `available_locales` ordering is transiently different from what a fresh boot has — worth a dedicated investigation, ideally with the same before/after `Rails.cache`-style global-state audit that resolved the `Parameter` cache-leak entry previously in this file. Left unfixed; not blocking this batch since it reproduces on develop with an unrelated new spec file present, not on any of the 6 fixes themselves.

**Second confirmed instance (`fix/remove-controller-display-class-name-i18n`, 2026-09-12):** adding
`spec/controllers/remove_controller_display_class_name_spec.rb` reproduces the *exact same*
`application_controller_spec.rb` flip (`bundle exec rspec spec/controllers spec/mailers`: 63
examples, this one failure, `fr`/`en` swapped the same way) - confirming it really is triggered by
"a new spec file exists somewhere in the load list," not by anything about
`application_mailer_notify_new_application_spec.rb`'s content specifically. The full-suite run also
now shows two more examples flipping the same way: `DeviseMailer#confirmation_instructions` and
`#reset_password_instructions` both "render in French by default" by asserting on French copy in
the mail body, but get back the raw, un-interpolated devise mailer layout HTML instead (neither
example touches `I18n`/`Parameter`/locale directly, and both pass in isolation and in
`spec/controllers spec/mailers` together - only the full run flips them).

**Correction, made during code review of the same branch**: an earlier draft of this note claimed
a plain `develop` full-suite run reports "257 examples, 116 failures" and used that to suggest the
file-count-sensitivity bug might account for a large share of the baseline. That number was an
artifact of a stale/incomplete `public/packs-test/` in the worktree that produced it (missing the
`css/` subdirectory `stylesheet_pack_tag` needs), not a real result - it has since tripped up more
than one agent working in a freshly-created worktree. **The real, verified baseline** (worktree
with a complete `public/packs-test/` copied from a built checkout) is **257 examples, 0 failures**
on plain `develop`, and **264 examples, 3 failures** with this branch's one new spec file added -
all 3 the same order-dependent flip described above (`DeviseMailer` x2 + this branch's own "en"
case), each passing individually. So the file-count-sensitivity bug is real and confirmed twice
now, but it is NOT masking a much larger pre-existing failure count - don't let a future run
without a proper asset manifest be mistaken for "the baseline was always this broken."

**Third investigation (`chore/root-cause-spec-order-flake`, 2026-09-13): one confirmed sibling bug
fixed, the original DeviseMailer/ApplicationController flip still not root-caused.** Tasked with
actually root-causing this rather than adding a fourth "still happens" confirmation. Findings:

*Reliable repro found, but it is timing-dependent, not purely example-order-dependent.*
`bundle exec rspec --order random --seed 4` (full suite, single process, no special setup beyond a
complete `public/packs-test/`) reproduced the exact `DeviseMailer#confirmation_instructions` /
`#reset_password_instructions` "renders in French by default" flip (mail body comes back as the
raw, un-interpolated `layouts/mailer.html.erb` HTML, exactly as previously documented) on most but
not all runs at that same seed on identical code. RSpec's `--seed` only fixes *example order*, not
all other sources of nondeterminism, and this run genuinely varied pass/fail at a fixed seed —
confirming a real timing/scheduling component, not just an ordering one. Adding trivial diagnostic
instrumentation (a `Kernel.puts` in an `around`/`before`/`after` hook, or an
`ActiveSupport::Notifications.subscribe` on `render_template.action_view`) measurably changed the
failure rate at the same seed, most likely by shifting thread-scheduling/IO-flush timing — a classic
Heisenbug signature. This makes the failure much harder to pin down than the earlier
`db/migrate/20240924141831` primary-key issue, which was a deterministic logic bug.

*Ruled out, with evidence:*
- No direct `I18n.locale =` or `I18n.default_locale =` assignment anywhere in `app/`, `lib/`,
  `config/`, `spec/`, or `test/` — grepped the whole tree.
- No `stub_const("Elvis::SUPPORTED_LOCALES", ...)` anywhere.
- `I18n.with_locale` in the installed gem (`i18n` 1.15.2) is the standard `ensure`-protected
  implementation (confirmed by reading `lib/i18n.rb`) — a raised exception inside the block still
  restores the previous locale, so a naive "forgot to restore" bug in the gem itself is not the
  cause.
- `I18n::Config` in this i18n version is scoped via Ruby's Fiber storage (`Fiber[:i18n_config]`,
  Ruby ≥ 3.2), not a plain `Thread.current` ivar — read the implementation to rule out a
  Fiber/thread cross-contamination path; each OS thread's root Fiber gets its own config, so this
  does not explain the leak either.
- `BaseEventJob` (`app/jobs/base_event_job.rb`) hardcodes `self.queue_adapter = :async`, meaning
  every `subscribe(true, &block)` listener (e.g. `ParameterListner`, which redundantly re-deletes
  the `parameter_<label>` cache key that `Parameter#expire_cache`'s `after_commit` already deletes
  synchronously) actually runs on a real background thread pool during tests, which looked like a
  promising general explanation for timing-sensitive flakes. Tested directly: temporarily forcing
  `self.queue_adapter = :inline` in the test env (so listener jobs run synchronously) did **not**
  stop the `--seed 4` DeviseMailer flip from reproducing. Real finding, ruled out as *this*
  bug's cause — but worth a separate look, since an unsynchronized background thread pool during
  tests is a legitimate general hazard independent of this ticket.
- Confirmed via `ActiveSupport::Notifications.subscribe(/render_(template|partial)\.action_view/)`
  that on a failing run, the failing example's `mail.body.encoded` call produces **zero**
  `render_template.action_view` events for either `devise/mailer/confirmation_instructions.html.erb`
  or `layouts/mailer.html.erb` — the returned body is not being freshly rendered by that call at
  all, yet its content is byte-for-byte the layout's own markup with a blank `yield`. This is a new,
  concrete clue (not in earlier entries) that narrows the bug to something in the
  ActionMailer/ActionView render-and-cache path returning already-produced content rather than to a
  simple "locale variable holds the wrong value at render time" story — but the exact mechanism
  (which cache/memoization layer is short-circuiting the render) was not identified within the
  effort budget for this ticket, and attempts to instrument more precisely to find it perturbed the
  timing enough to stop reproducing (see above).
- Separately observed a second, differently-shaped flake co-occurring with the DeviseMailer one:
  `spec/requests/locations_destroy_spec.rb`'s `"does not raise and re-renders the index with the
  flash error when the location has dependent rooms"` example expects `flash[:error]` to hold a
  French message and got `nil` instead. This showed up twice independently: once in a `--seed 4`
  random-order run alongside the DeviseMailer failures, and again in a **plain, default-order**
  `bundle exec rspec` run (no `--order random` at all) — 1 out of 3 consecutive plain full-suite
  runs on identical code failed with exactly `DeviseMailer#reset_password_instructions` +
  this `locations_destroy_spec` example, the other 2 runs were clean. That a *plain* run (RSpec's
  default declaration order, not `--order random`) flakes too, and does so intermittently across
  otherwise-identical consecutive invocations, confirms this is genuine wall-clock-timing
  nondeterminism, not merely "the file list changes RSpec's declared example order." Not
  investigated further; noting it here because it narrows the search space for whoever picks this
  up next away from "what touches I18n" and toward "what varies in wall-clock timing across a
  full run" (GC pauses, thread pool scheduling, I/O buffering) — start there instead.

*One confirmed and fixed sibling bug* (the task explicitly asked to check for one, given the
already-fixed `Parameter` cache-leak): `Season.current` and `Season.current_apps_season`
(`app/models/season.rb`) cache their result via `Rails.cache.fetch(key, expires_in: 12.hours)`
— including a cached `nil` "no season yet" result, since `Rails.cache.fetch` still writes a `nil`
block result unless the caller passes `skip_nil:` — with **no invalidation hook**, unlike
`Parameter` (`after_commit :expire_cache`). Confirmed this causes a real
`ArgumentError: comparison of DateTime with nil failed` crash (in `Season#current_apps_season`,
reached via `Ability#initialize` → `User#family`) by running two concurrent `bundle exec rspec`
processes against the same worktree against separate Postgres databases: `Rails.cache` is a real
on-disk `ActiveSupport::Cache::FileStore` in the test env (path is `Rails.root.join("tmp/cache")`,
confirmed via `Rails.cache.inspect`), shared **by filesystem path**, so two processes racing the
same on-disk cache can each poison the other's `current_season`/`current_apps_season` entry even
though their databases are entirely separate. Two existing spec files
(`spec/requests/evaluation_pages_spec.rb`, `spec/requests/payment_admin_pages_spec.rb`) already
carry a hand-rolled `around` hook that deletes exactly these two cache keys before/after each
example — evidence a previous author had already hit this exact hazard and worked around it
locally without fixing the root cause. Fixed by adding `after_commit :expire_season_caches` to
`Season`, mirroring `Parameter`'s existing pattern; regression coverage in
`spec/models/season_spec.rb` (confirmed red without the fix, green with it). This does not appear
to be the mechanism behind the DeviseMailer/ApplicationController flip specifically (mailer specs
never touch `ApplicationController`/`Ability`/`Season` at all), but it is a real bug in its own
right and was left unfixed until now.

**Status: still open for the original DeviseMailer/ApplicationController flip.** Whoever picks
this up next should start from the "zero render events, byte-identical stale content" clue above
rather than from the locale-value theories in the earlier entries (those are now fairly well
ruled out), and should expect the repro to be seed-stable-but-not-instrumentation-stable — prefer
tools that don't add their own `puts`/notification overhead (e.g. a `TracePoint` filtered tightly
enough not to fire on every line, or reading `ObjectSpace`/GC stats after the fact) over sprinkling
print statements, since the latter measurably changes the failure rate.

