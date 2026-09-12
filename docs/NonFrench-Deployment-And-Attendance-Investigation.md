# Non-French deployment & attendance/scheduling redesign — investigation notes

Investigated 2026-09-12, read-only (no code changed), as groundwork for two capabilities under
consideration: running Elvis for a school outside France, and reworking attendance/make-up-lesson
handling to match a specific real workflow. Parked here for later — not scheduled, not part of the
Phase 07 i18n plan or `docs/KnownIssues.md`'s backlog. Nothing in either of those gets resolved by
this document; it only answers "does the current foundation support this," so a later effort can
start from an accurate map instead of re-deriving one.

## 1. Non-French deployment (address / VAT / legal pages / timezone)

Not one uniform depth — some of this is a config/content change, one piece is a real integration
problem.

### 1.1 School address & automatic holiday population — **deep**

Not a validation problem: `Address` (`app/models/address.rb`) has no validations, and
`SchoolParameters.jsx`'s country dropdown already uses `ISO3166::Country`, so any country can be
selected today. The actual break: season creation automatically calls **French government-only
APIs** to resolve holidays, wired into `app/listeners/season_listener.rb` (fires on season
creation, including the first-boot "3 seasons created by default" flow) and
`seasons_controller.rb` (season replication):

- `Seasons::PopulateHolidays` (`app/services/seasons/populate_holidays.rb`) calls
  `Holidays::SchoolHolidays.new(year, academie, zone, address)`, which geocodes the address via
  `api-adresse.data.gouv.fr` (France's national address database) to resolve a French "académie"
  via `data.education.gouv.fr`. If geocoding fails (any non-French address) and no `zone` override
  is set, `validate!` raises `ArgumentError` (`school_holidays.rb:230-235`) — a hard crash, not a
  silent fallback.
- `Holidays::BankHolidays` is worse: its `ZONES` constant is a hardcoded list of French
  overseas-territory names (`metropole`, `guadeloupe`, `martinique`, …), and it calls
  `calendrier.api.gouv.fr` directly. No non-French path exists at all — only a manual `zone`
  override via `Parameter` (`BANK_HOLIDAYS_ZONE` / `ZONE_SET_BY_USER`), which exists as an escape
  hatch but isn't surfaced anywhere in the setup flow.
- Separately: `School#phone_number` hardcodes a `+33` prefix onto any number that doesn't already
  start with `+`, with a literal `# TODO: handle other countries` already in the code.

**What this needs**: a real decision, not a config tweak — manual holiday entry, a different
non-French holiday source, or making the French auto-population an explicit opt-in convenience
with a clean manual fallback for everyone else.

### 1.2 VAT — **shallow**, one real bug

No VAT *calculation* exists anywhere. `School#entity_subject_to_vat` /
`activities_not_subject_to_vat` are booleans that only toggle whether `bill.html.erb`/
`payment_schedule/show.html.erb` print a French VAT-exemption disclaimer (common for French
non-profit associations, printed alongside the `siret_rna` registry number). Generalizing this is
a display/copy decision. (`bill.html.erb` itself stays a deliberate French-only fiscal document —
not in scope to change.)

Bug found along the way: `app/controllers/organizations_controller.rb:8,32` hardcodes
`tax_id = { type: 'eu_vat', ... }` for every organization regardless of actual country — a
non-EU (or non-VAT EU) tax ID gets mistagged. Contained, one-file fix once someone decides what
tax-ID types to support.

### 1.3 Legal / privacy page — shallow structurally, content is actively wrong outside the EU

`app/views/cgu/index.html.erb` (+ `config/locales/{fr,en}.yml` `views.cgu.index.*`, ~30 keys) is a
normal ERB view with no override mechanism today. The content explicitly names **GDPR (EU
2016/679)** and France's **1978 "Loi Informatique et Libertés,"** and — concretely —
`cgu/index.html.erb:43` hardcodes a direct link to **cnil.fr**, the French data-protection
regulator, as *the* place to exercise your rights. For a school outside French/EU jurisdiction
that's not a stylistic nit, it's wrong instructions (wrong regulator, and GDPR may not even
apply). Any TOS page would need the same treatment.

### 1.4 The `Parameter` config pattern is already generic enough to build on

`Parameter` (`app/models/parameter.rb`) is a plain label/value/value_type key-value store with
cache invalidation, already used for exactly this kind of per-installation setting
(`BANK_HOLIDAYS_ZONE`, available languages, etc.) — no schema commitment to France, nothing here
needs new infrastructure. What's missing is *use* of it in 1.1/1.3, not the mechanism itself.
Also relevant: `NotificationTemplate` (DB-stored, Liquid + WYSIWYG, already used for admin-editable
emails) is the right existing precedent to extend to a per-installation legal-page override,
rather than inventing a new mechanism.

### 1.5 Timezone — same class of problem, already tracked

`config.time_zone = "Paris"` (`config/application.rb:50`) plus two frontend
`PARIS_DATE_FORMAT_OPTIONS = { timeZone: "Europe/Paris" }` constants — see
`docs/KnownIssues.md`'s "Frontend date formatting hardcodes `Europe/Paris`" entry (still
accurate). Same root pattern as 1.1: built assuming one specific French installation.

### Bottom line

VAT and legal-page framing are **config/copy work** — no redesign, storage layer already exists.
The address/holiday pipeline is **genuinely deep** — it's wired to French-government-only APIs at
a load-bearing point (automatic season creation), and needs an actual non-French holiday-source
strategy, not a default swap.

## 2. Attendance / lesson-planning / make-up-lesson fit

The workflow to support: a teacher has an allotted time block (e.g. an afternoon) in which they
schedule individual student slots; every week they mark each student present/absent with optional
notes; they can set up make-up lessons either inside their own allotted time or in a different
slot after board approval; and they can schedule extra lessons once a student's standard package
is exhausted.

| # | Behavior | Verdict | Evidence |
|---|---|---|---|
| 1 | Teacher declares an allotted-time block, places slots inside it | **Exists** | `TimeInterval` (`app/models/time_interval.rb`) has a `kind` field distinguishing availability (`"p"`, disponibilité) from an actual lesson (`"c"`, cours) plus evaluation/option kinds; `is_validated` marks confirmed vs. tentative. `frontend/components/availability/AvailabilityInput.jsx` is exactly "teacher picks weekday + start/end + kind." `Activity#create_instances` (`app/models/activity.rb:512`) generates weekly `ActivityInstance` rows from a recurring `TimeInterval`, with conflict-checking already built in (`TimeInterval#check_for_conflict`/`overlap_teacher`/`overlap_room`). |
| 2 | Weekly present/absent + notes | **Exists** | `StudentAttendance` (`app/models/student_attendance.rb`): `attended` (present/absent/justified-absence) + a `comment` text field, one row per lesson-instance per student. `frontend/components/PresenceSheet.jsx` is a batch weekly-marking UI (`handleBulkUpdateAttendances`) with a justified-absence flag already. |
| 3 | Make-up lesson inside the teacher's own allotted time | **Does not exist** | No `is_makeup`/`replaces_activity_instance_id` or equivalent anywhere on `ActivityInstance`/`StudentAttendance`/`TimeInterval` (grepped the app for "rattrapage"/"make-up" — no real hits). `app/services/scripts/replicate_activities.rb` / `replicate_week_activities.rb` are season-forward schedule *replication* (copy a reference week's recurring activities into future weeks) — confirmed to be a different concept, not per-student rescheduling. No link between an absence record and a replacement slot today. |
| 4 | Make-up in a different slot, needs board approval | **Does not exist** | `ActivityApplicationStatus` is a whole-*enrollment* state machine (pending/attributed/proposed/accepted/refused/waiting-list/stopped/canceled) — governs a student's overall enrollment, not individual-lesson rescheduling. No lesson-level or attendance-level approval state exists. |
| 5 | Extra lessons after package exhaustion | **Partially exists — and actively blocks the target behavior** | `Formule` (packages) has `number_of_items` and validates total assigned activities can't exceed it. Booking already tracks and displays `lessons_remaining` (`PackUtilization.jsx`, the `packs.bookingList.remainingReminder` i18n key), but `ActivityBooking.jsx:91` (`wishList.length >= pack.lessons_remaining`) explicitly **stops** booking once the count hits zero — the opposite of the target behavior. |

**Overall verdict**: items 1, 2, and 5 map onto existing concepts — `TimeInterval` /
`ActivityInstance` / `StudentAttendance` / `Formule` are the right nouns and mostly the right shape
already. Items 3 and 4 need genuinely new modeling (no existing primitive for
"this lesson replaces that missed one" or "this reschedule needs approval"), but both compose on
top of what's there rather than requiring a different foundation: a make-up slot is still a
`TimeInterval` + `ActivityInstance`; an approval workflow would look similar in shape to the state
machine `ActivityApplicationStatus` already demonstrates for enrollment. This is an *extension* of
the existing `Activity`/`TimeInterval`/`ActivityInstance`/`StudentAttendance` domain, not a
replacement of it.

## Status

Parked. No action taken, nothing scheduled. When this gets picked up, the natural next step for
§1 is deciding the non-French holiday strategy (the one genuinely hard call in that section); for
§2 it's designing the make-up-lesson/approval data model (items 3–4) and deciding how "extra
lesson beyond package" should be priced/tracked (item 5).
