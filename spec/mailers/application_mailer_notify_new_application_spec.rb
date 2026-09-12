# frozen_string_literal: true

require "rails_helper"

# End-to-end regression coverage for the same KnownIssues.md entry as
# spec/mailers/application_drop_spec.rb: renders ApplicationMailer#notify_new_application's real
# file-based view (no NotificationTemplate override present, matching a fresh install) against a
# real ActivityApplication and confirms it no longer raises NoMethodError on
# @application.user.first_name/.last_name/@application.season.label.
#
# ActivityAssignedMailer#activity_assigned's file-based view is NOT exercised end-to-end here: its
# view also calls @activity.activity_ref.label / @activity.time_interval.start / @activity.teachers
# .first.full_name, none of which exist on LiquidDrops::ActivityDrop either (a separate,
# pre-existing bug independent of ApplicationDrop, out of scope for this fix -- see
# spec/mailers/application_drop_spec.rb for coverage of the ApplicationDrop half using the same
# hash shape ActivityAssignedMailer builds).
RSpec.describe ApplicationMailer, type: :mailer do
  let!(:school) { School.create!(name: "École de Test") }
  let(:user) do
    FactoryBot.create(:user, email: "notify-new-application@example.com", first_name: "Camille", last_name: "Martin")
  end
  let(:season) do
    Season.create!(
      label: "2025-2026",
      start: 2.years.ago, end: 1.year.from_now,
      opening_date_for_applications: 3.years.ago,
      opening_date_for_new_applications: 30.months.ago,
      closing_date_for_applications: 6.months.ago
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind) }
  let(:application) do
    app = ActivityApplication.create!(
      user: user, season: season, activity_application_status: ActivityApplicationStatus::TREATMENT_PENDING
    )
    DesiredActivity.create!(activity_application: app, activity_ref: activity_ref)
    app
  end

  # .message forces the view to render (which is what raised NoMethodError before the fix)
  # without going through actual delivery, which separately requires a configured "from" address
  # unrelated to this bug.
  it "renders notify_new_application without raising NoMethodError" do
    expect { ApplicationMailer.notify_new_application(application.id).message }.not_to raise_error
  end

  it "renders the applicant's name and the season label in the mail body (proves user/season resolved)" do
    mail = ApplicationMailer.notify_new_application(application.id).message
    body = mail.html_part ? mail.html_part.body.to_s : mail.body.to_s

    expect(body).to include("Camille")
    expect(body).to include("Martin")
    expect(body).to include("2025-2026")
  end
end
