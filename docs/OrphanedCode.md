# Orphaned code

A durable record of code deleted from this app on suspicion of being dead/unreachable, so a
report like *"I get a 404/500 here, was there ever a view/controller for this?"* has a fast path
to check instead of `git log` spelunking. This fork has no plugins installed, so the "a plugin
might still reference it" caveat that used to justify leaving dead code in place doesn't apply —
confirmed-unreachable code gets deleted outright, logged here with a recovery recipe.

To recover any entry below, find the commit that removed it, then check out the parent state:

```shell
# Whole file/directory deletions:
git log --oneline --diff-filter=D -- <path>

# Partial removals (a block deleted from a file that still exists) - pick a distinctive symbol
# name from the entry below and pickaxe-search for the commit that removed it:
git log --oneline -S'<symbol>' -- <path>

# Once you have the commit SHA from either search:
git show <that-sha>^:<path>            # print the file/lines as they were just before
git checkout <that-sha>^ -- <path>     # or restore the whole file in place
```

## `9ad195d8` (2026-09-04)

- `frontend/components/generalPayments/GeneralPayments.jsx`: unused `swal` (`sweetalert2`) and
  `csrfToken` imports.
- `frontend/components/generalPayments/CheckList.jsx`: dead `message` state (never rendered, no
  `MessageModal`) and the `MESSAGE_MODAL_ID` constant it went with.
- `frontend/components/formules/NewFormule.jsx` (whole file, 603 lines): standalone "create
  formule" screen superseded by `EditFormule.jsx`.
- `frontend/components/planning/Calendar.jsx`: the `ConflictDisplayItem` component (referenced only
  from inside a commented-out JSX block in `CalendarControls`) plus that commented block itself,
  and the `handleSetToConflictDate` method/prop-thread that had no other caller once that block
  was gone.
- `frontend/components/planning/activity_management/` (whole subtree: `index.jsx`,
  `attendance_table.jsx`, `activity_edition.jsx`, `edit_group_name_input.jsx`,
  `recurrences_editor.jsx`, `teacher_covering_editor.jsx`, `teachers_editor.jsx`): an abandoned
  extract-into-files refactor — everything in it was unreachable except the `withSave` helper,
  which moved to `frontend/components/planning/withSave.jsx` (its one live consumer,
  `ActivityDetailsModal.jsx`, now imports it from there).
- `frontend/components/planning/ActivityDetailsModal.jsx`: the `TeachersEditor` component, the
  `renderTeacherSelection()` method, and the `teachers_constrained` state field they were the only
  readers of — the live teacher-editing UI is inline in the same file. Locale keys removed with it:
  `planning:activityModal.teachersEditor.{teacher,main,remove,needMainTeacher,cannotRemoveMain}`
  and `planning:activityModal.{otherTeacherLabel,chooseTeacher}`;
  `planning:activityModal.{noMainTeacher,teacherLabel}` were left alone — both still used by the
  live `ActivityEdition` component.

## `48a62087` (i18n-06, extract-evaluation)

- `app/views/evaluation_level_ref/create.html.erb`, `app/views/evaluation_level_ref/update.html.erb`
  — the controller's `#create`/`#update` actions always `render json:`/redirect, never fall
  through to these Rails-scaffold templates.

## 2026-09-14 orphaned-code audit

Re-audit of `docs/KnownIssues.md`'s "Dead/unrouted code" section, item by item (route + controller
action inspection, not just grep for the scaffold path) — user pre-authorized deletion of anything
confirmed genuinely dead. All of the following are Rails-scaffold placeholder templates that
either have no route, or have a route/action that never falls through to implicit rendering
(explicit `render json:`/redirect in every branch, or an empty action nothing ever links to):

- `app/controllers/static_pages_controller.rb` + `app/views/static_pages/{landing,about}.html.erb`
  + `app/views/layouts/static_pages.html.erb`: zero routes, zero references anywhere in the app —
  a fully self-contained dead subtree.
- `app/views/admin/edit_mail_settings.html.erb`: no route, no controller action (superseded by
  `ParametersController#mails_parameters_edit`).
- `app/views/activity/remove.html.erb`: the route (`get "activity/remove"`, also removed from
  `config/routes.rb`) pointed at `ActivityController#remove`, which doesn't exist — this route
  would have 500'd (`AbstractController::ActionNotFound`) if ever hit.
- `app/views/activity_instance/delete.html.erb`: `#delete` always `render json:`.
- `app/views/activity_instance/update.html.erb`: no `#update` action exists, and no route maps to
  it either (the only related route targets `#update_all`).
- `app/views/activity_ref/create.html.erb`, `app/views/activity_ref/update.html.erb`: both actions
  always `render json:`.
- `app/views/activities_applications/create.html.erb`: `#create` always `render json:`.
- `app/views/comments/{create,update,destroy}.html.erb`: all three actions always `render json:`.
- `app/views/time_interval/validate.html.erb`: no `#validate` action exists; the only relevant
  route targets `#create_activity_instances`.
- `app/views/family_members/destroy.html.erb`: no route to `family_members#destroy` at all (only
  `update_all` is routed).
- `app/views/family_member_users/destroy.html.erb`: `#destroy` always `render json: {}`.
- `app/views/evaluation_level_ref/show.html.erb` (+ the empty `def show; end` action it backed,
  removed from `app/controllers/evaluation_level_ref_controller.rb`, and the route restricted to
  `resources :evaluation_level_ref, except: [:show]`): route+action existed, but nothing in the
  app ever links to `evaluation_level_ref_path(id)` (only `new_`/`edit_` variants are used) — raw
  Rails-scaffold placeholder text (`<h1>EvaluationLevelRef#show</h1>`), never customized.
- `app/views/payment_statuses/show.html.erb` (+ the route restricted to
  `resources :payment_statuses, except: [:show]`): `resources` generated the route, but
  `PaymentStatusesController` never defined a `#show` action — would have 500'd if hit.
- `app/views/due_payment/update.html.erb`: `#update` always `render json:`.
- `frontend/components/WorkGroupTemplateEditor.jsx` (root-level): zero importers — the one call
  site (`activityRef/ActivityRefContainer.jsx`) imports its own sibling
  `activityRef/WorkGroupTemplateEditor.jsx` instead.
- `frontend/components/parameters/Rooms/RoomsParameters.jsx`: zero importers/mounts — the live
  `rooms_parameters` view (`app/views/parameters/rooms_parameters/index.html.erb`) mounts
  `parameters/Rooms/Localisations` instead.
- `app/views/practice/bands/_form.html.erb`: never rendered — `bands/new.html.erb` and
  `bands/edit.html.erb` mount React components (`practice/BandCreator`/`practice/BandEdit`)
  directly and never reference this partial.

## 2026-09-14, found while i18n-extracting (roadmap item 11)

- `frontend/components/utils/BtnApiElement.jsx`: zero importers and no `react_component(...)` mount
  anywhere in `app/views/` — confirmed via both a JS-import grep and an ERB-mount grep, same method
  as the audit above. Was about to i18n-extract its hardcoded French swal text before checking
  whether anything actually renders it; nothing does.

## 2026-09-14, small-fixes batch

- `frontend/components/planning/StudentModal.jsx`: zero importers outside its own test file —
  confirmed via a repo-wide grep (`frontend/`, `app/views/**/*.erb`) for both the import path and
  a `react_component("StudentModal"...)` mount; neither exists. Not wired into `Planning.jsx`'s
  render tree. Test coverage (`PlanningModals.test.jsx`'s `describe("StudentModal", ...)` block)
  removed with it. Locale key removed with it: `planning:studentModal.title` (its `kinds.*` and
  `common:actions.save` keys are shared with other components, left alone).

## 2026-10-01, dependency-health phase 2

- `frontend/components/Suggester.jsx` (whole file) + the `react-autosuggest` dependency it was the
  only user of (removed from `package.json`/`yarn.lock`): zero importers/mounts anywhere in
  `frontend/` or `app/views/**/*.erb` — confirmed via both an import grep and an ERB-mount grep.
  The `.suggester-results`/`.suggester-results__*` CSS block in
  `frontend/packs/application.scss` only styled this component's react-autosuggest class hooks;
  removed with it. The backend half of this same dead feature,
  `AutosuggestController#cities` (+ its `get "/autosuggest/cities"` route in
  `config/routes.rb`), is separately confirmed dead too (zero references anywhere in
  `app/`/`frontend/`/`spec/`/`test/`, and no commit ever referenced `autosuggest/cities` per
  `git log --all -S`) but is out of scope for this frontend-only branch — left for a
  backend-scoped cleanup.

## 2026-10-03, dependency-health phase 4a (draft-js dead-code cleanup)

Scoped prep for the `react-draft-wysiwyg`/`draft-js` → TipTap migration (phase 4): removing dead
draft-js call sites before touching any live editor/viewer code.

- `frontend/components/plugins/Plugins.jsx`: the draft-js block in `getPlugins()` that parsed
  `res.display_text` and called `setEditorState(EditorState.createWithContent(...))`, plus the
  now-unused `draft-js` import (`EditorState`, `convertToRaw`, `convertFromRaw`, `ContentState`).
  Double-dead: `setEditorState` was never a real state setter (no matching `useState` in the
  component — it would have thrown `ReferenceError` if ever called), and `display_text` is a key
  `PluginsController#index` (`app/controllers/plugins_controller.rb`) never returns (it renders
  only `{ plugins: ... }`), so the branch was also unreachable. `Plugins.jsx` itself is live
  (mounted at `app/views/plugins/index.html.erb`) — only this block was dead.
- `frontend/components/activityApplications/FormulaChoice.jsx`: the `infoText` prop and the
  `WysiwygViewer` block rendering it, plus the now-unused `WysiwygViewer` import. Its only feed,
  `infoText={this.props.formulaChoiceDisplayText}` in `Wizard.jsx`, is removed with it —
  `formulaChoiceDisplayText` is never passed by either Rails view that mounts `Wizard.jsx`
  (`app/views/activities_applications/new.html.erb`, `new_for_existing_user.html.erb`). `WysiwygViewer`
  itself stays live elsewhere (`ActivityChoice.jsx`, `Validation.jsx`,
  `WrappedPayerPaymentTerms.jsx`, `availability/AvailabilityManager.jsx`) — not touched.
  `FormulaChoice.test.jsx` updated to match (dropped the `infoText`/`WysiwygViewer` mock);
  `Plugins.test.jsx`'s api mock dropped the now-meaningless `display_text: null` fixture key.

## 2026-10-15, React 19 prep (remove `react-draft-wysiwyg` npm dependency)

Follow-up to phase 4a: with every real `<Editor>` call site already swapped onto the TipTap-based
editor, the `react-draft-wysiwyg` package itself had no remaining live import — just the orphaned
`@import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";` in `frontend/packs/application.scss`
and historical comments in `RichTextViewer.tsx`/`RichTextViewer.test.tsx` and two parameter test
files explaining what it used to be. Removed `"react-draft-wysiwyg"` from `package.json` and the
`.scss` import; `yarn install` then dropped it and its exclusive transitive deps (`classnames`,
`draftjs-utils`, `html-to-draftjs`, `linkify-it`, `uc.micro`) from `yarn.lock` — none of those five
had any other consumer in the tree. `draft-js`/`draftjs-to-html` stay: still a live read-path
fallback in `RichTextViewer.tsx` for content not yet migrated off the old Draft.js JSON format,
gated on a separate DB content migration. Prep for the React 18→19 bump —
`react-draft-wysiwyg`'s peer-dependency range capped React at `^18.x.x`.

## 2026-10-19, dependency-health phase 4e (remove `draft-js`/`draftjs-to-html`)

Closes out phase 4. The Draft.js-to-HTML `Parameter` content migration (PR #148) has now been run
against every real environment known to us, so no stored value can be Draft.js JSON any more — which
made the frontend's format-detection layer unreachable. The Ruby-side migration tooling is kept
(rewritten, see below) rather than deleted, as a permanent safety net for any environment this
doesn't hold true for.

- `frontend/tools/wysiwygConversion.js` + `wysiwygConversion.test.js` (whole files): the
  `convertWysiwyg` / `tryParseDraftRaw` / `isDraftJsRaw` / `wysiwygToHtml` / `wysiwygToEditableHtml`
  module. With no format left to detect, every export collapsed to `x ?? ""` — not worth a named
  module, so its 3 call sites inline the null-coalescing instead: `common/RichTextViewer.tsx`,
  `parameters/ActivityApplications/ApplicationStepParameters.jsx`,
  `parameters/Payments/EditPaymentScheduleOptions.jsx`. The two parameter editors'
  now-unreachable "conversion failed" `swal` branch went with it, and with that its locale keys
  `parameters:activityApplications.stepParams.contentConversionError` and
  `parameters:payments.scheduleOptions.errors.contentConversionError` (fr + en).
- `frontend/tools/wysiwygConversionCli.js` + `wysiwygConversionCli.test.js`: the Node-CLI-bridge
  half of the migration tool (stdin raw UTF-8 → stdout `{isDraftJs, html, failed}`), deleted along
  with `draft-js`/`draftjs-to-html` themselves. Confirmed no other invoker of the CLI script in
  `Dockerfile`, `docker-compose.yml`, `Procfile`, `.github/`, `bin/`, `config/`, `db/`, `app/` or
  `test/` besides the rake task below.
- `lib/elvis/wysiwyg_converter.rb`, `lib/elvis/wysiwyg_content_migrator.rb` and the
  `elvis:migrate_wysiwyg_content` task in `lib/tasks/elvis.rake` are **not** deleted — they were
  rewritten as a pure-Ruby port of draftjs-to-html's output (no Node/npm involved at all) and kept
  permanently as a safety net, in case some environment's `Parameter` rows were never actually
  migrated. Safe to leave wired up indefinitely: it only touches the 3 known labels
  (`payment_step.display_text`, `pricing_info_application.display_text`,
  `availability_info_application.display_text`), is a clean no-op on a blank or already-HTML
  value, and has no dependency to go stale. `spec/lib/elvis/wysiwyg_converter_spec.rb` pins its
  output against golden fixtures captured once from real `draftjs-to-html@0.9.1`/`draft-js@0.11.7`
  (in a disposable scratch project, not part of this repo);
  `spec/lib/migrate_wysiwyg_content_rake_task_spec.rb` covers the task's DB/idempotency logic.
- `frontend/components/utils/WysiwygViewer.tsx` (whole file): the original Draft.js-based viewer,
  superseded by `common/RichTextViewer.tsx`. Zero importers and zero
  `react_component("...WysiwygViewer"...)` mounts in `app/views/` — every former call site
  (`ActivityChoice.jsx`, `Validation.jsx`, `WrappedPayerPaymentTerms.jsx`,
  `availability/AvailabilityManager.jsx`, `FormulaChoice.jsx`) had already moved to
  `RichTextViewer`. It imported both packages directly, so it was also a hard blocker for dropping
  them.

Removed `"draft-js"` and `"draftjs-to-html"` from `package.json`; `yarn install` then dropped them
and their exclusively-owned transitive deps from `yarn.lock` (97 lines removed, 0 added): `asap`,
`core-js@^3.6.4`, `cross-fetch`, `fbjs`, `fbjs-css-vars`, `immutable@~3.7.4`, `node-fetch@^2.6.12`,
`promise@^7.1.1`, `setimmediate@^1.0.5`, `tr46@~0.0.3`, `ua-parser-js@^0.7.18`,
`webidl-conversions@^3.0.0`, `whatwg-url@^5.0.0`. Verified afterwards with `yarn why`: `fbjs` is
gone entirely, while `immutable` (now `5.1.9`, via `sass`) and `object-assign` (via `prop-types`,
`@rsdoctor/*`, `i18next-parser`) survive on unrelated consumers.

**Deliberately KEPT — do not "clean up" later:** `InsCompatibleUnderline` in
`frontend/components/common/TipTapEditor.tsx` and its `TipTapEditor.test.tsx` coverage. The
migration converted content *through* `draftjs-to-html`, which serializes Draft's UNDERLINE as
`<ins>` rather than `<u>`, so `<ins>` tags are now permanently baked into the migrated HTML in the
DB. That `parseHTML` extension is therefore *more* necessary after the migration, not less —
removing it would silently drop every underline the first time such content is opened and saved.
Remaining `draft`/`draftjs` mentions under `frontend/` are accurate historical comments only.

## Deliberately NOT touched (all audits)

Real, live issues — not dead code, don't delete:
- `app/views/devise/passwords/edit.html.erb` — Devise's own stock route
  (`edit_user_password_url` → `PasswordsController#edit`) still renders this; the app's own
  reset-password *email* just links to a different, custom route instead. Reachable, just
  unlinked from the one email that would normally lead there.
- `RemoveController#get_references` — a real, tested method (bypassing HTTP entirely is how the
  regression spec exercises it) whose HTTP action never calls `render`, always falling through to
  `204 No Content`. A gap to potentially fix (add a `render json:`), not dead code to delete.
- `app/views/parameters/formules_parameters_edit.html.erb` references
  `react_component("editParameters/FormulesParameters", ...)`, but
  `frontend/components/editParameters/FormulesParameters.jsx` doesn't exist — the opposite of dead
  code (a live route with a missing implementation). Worth its own investigation.
