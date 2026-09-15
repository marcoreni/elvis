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

**Deliberately NOT touched** (real, live issues — not dead code, don't delete):
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
