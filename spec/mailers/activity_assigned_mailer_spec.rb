# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "ActivityAssignedMailer#activity_assigned's
# file-based view calls undefined LiquidDrops::ActivityDrop methods": app/views/
# activity_assigned_mailer/activity_assigned.html.erb calls @activity.activity_ref.label,
# @activity.time_interval.start/.end and @activity.teachers.first.full_name directly, but
# LiquidDrops::ActivityDrop only defined flattened accessors (label, activity_start/activity_end,
# teacher_first_name/teacher_last_name, ...) -- no activity_ref/time_interval/teachers methods --
# so those view calls raised NoMethodError whenever the file-based view was actually rendered
# (i.e. no DB NotificationTemplate override).
#
# Fix mirrors the sibling LiquidDrops::ApplicationDrop fix: adds activity_ref/time_interval/
# teachers accessors returning small LiquidDrops::ActivityRefDrop/TimeIntervalDrop/UserDrop
# objects that respond to .label, .start/.end and .full_name respectively. The mailer's as_json
# include was also extended with `teachers: {}` (the has_many :teachers collection) alongside the
# pre-existing `teacher: {}` (the single "main" teacher used by the flattened accessors), since
# only the collection form supports @activity.teachers.first.
RSpec.describe ActivityAssignedMailer, type: :mailer do
  let!(:school) { School.create!(name: "École de Test") }
  let(:teacher) do
    FactoryBot.create(:user, email: "teacher@example.com", first_name: "Jean", last_name: "Dupont", is_teacher: true)
  end
  let(:student) do
    FactoryBot.create(:user, email: "student@example.com", first_name: "Camille", last_name: "Martin")
  end
  let(:season) do
    Season.create!(
      label: "2025-2026",
      start: 2.years.ago, end: 1.year.from_now,
      opening_date_for_applications: 3.years.ago,
      opening_date_for_new_applications: 30.months.ago,
      closing_date_for_applications: 6.months.from_now,
      is_current: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let(:activity_ref) do
    FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano - Cours individuel")
  end
  let(:location) { Location.create!(label: "Bâtiment principal") }
  let(:room) { Room.create!(label: "Salle 1", location: location) }
  let(:time_interval) do
    TimeInterval.create!(start: DateTime.new(2025, 9, 15, 14, 0), end: DateTime.new(2025, 9, 15, 15, 0), kind: "c")
  end
  let(:activity) do
    act = Activity.create!(
      time_interval: time_interval, activity_ref: activity_ref, room: room, location: location
    )
    TeachersActivity.create!(activity: act, teacher: teacher, is_main: true)
    act
  end
  let(:application) do
    app = ActivityApplication.create!(
      user: student, season: season, activity_application_status: ActivityApplicationStatus::TREATMENT_PENDING
    )
    DesiredActivity.create!(activity_application: app, activity_ref: activity_ref, activity: activity)
    app
  end

  # .message forces the view to render (which is what raised NoMethodError before the fix)
  # without going through actual delivery.
  it "renders activity_assigned without raising NoMethodError" do
    expect { ActivityAssignedMailer.activity_assigned(student, "some-token", application, activity).message }
      .not_to raise_error
  end

  it "renders the activity ref label, schedule and teacher name in the mail body" do
    mail = ActivityAssignedMailer.activity_assigned(student, "some-token", application, activity).message
    body = mail.html_part ? mail.html_part.body.to_s : mail.body.to_s

    expect(body).to include("Piano - Cours individuel")
    expect(body).to include("Jean Dupont")

    # Time zone conversion (activity_assigned.html.erb calls .strftime directly on the DateTime
    # objects TimeIntervalDrop#start/#end now return, without any Time.zone conversion) means the
    # rendered hour can shift from the literal UTC values used above -- assert consistency with
    # the drop's own output instead of hardcoding a wall-clock hour.
    expect(body).to include(time_interval.start.strftime("%H:%M"))
    expect(body).to include(time_interval.end.strftime("%H:%M"))
  end
end
