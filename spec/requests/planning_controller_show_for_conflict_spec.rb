# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "Serializer cycle can SystemStackError when
# rendering a TimeInterval with an activity_instance": PlanningController#show_for_conflict built
# @intervals via `ActiveModelSerializers::SerializableResource.new(intervals, each_serializer:
# TimeIntervalSerializer)` with no `include:` guard, so the app-wide `default_includes = "**"`
# recurses forever once an interval's activity_instance points back to an activity that
# references that same interval (see Activity#create_instances's duplicate-avoidance check).
RSpec.describe "GET /plannings/conflict/:conflict_id", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) do
    FactoryBot.create(
      :user, email: "planning-conflict-admin@example.com", first_name: "Admin", last_name: "Conflict", is_admin: true
    )
  end
  let(:teacher) do
    FactoryBot.create(
      :user, email: "planning-conflict-teacher@example.com", first_name: "Teacher", last_name: "Conflict",
             is_teacher: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano") }
  let(:location) { Location.create!(label: "Batiment show_for_conflict spec") }
  let(:room) { Room.create!(label: "Salle show_for_conflict spec", location: location) }
  let!(:season) do
    Season.create!(
      label: "Saison show_for_conflict spec",
      start: Date.today.beginning_of_day,
      end: 10.days.from_now.end_of_day,
      opening_date_for_applications: 30.days.ago,
      opening_date_for_new_applications: 25.days.ago,
      closing_date_for_applications: 5.days.from_now,
      is_current: true
    )
  end

  # The cyclic interval: it's both the Activity's own `time_interval` and the `time_interval` of
  # one of that Activity's `activity_instance`s -- TimeInterval#activity_instance ->
  # ActivityInstance#activity -> Activity#time_interval loops back to this same record.
  let!(:cyclic_interval) do
    TimeInterval.create!(start: 4.days.from_now.change(hour: 10), end: 4.days.from_now.change(hour: 11),
                         kind: "c", is_validated: true)
  end
  let!(:activity) do
    act = Activity.create!(time_interval: cyclic_interval, activity_ref: activity_ref, room: room, location: location)
    TeachersActivity.create!(activity: act, teacher: teacher, is_main: true)
    act
  end
  let!(:cyclic_instance) do
    ActivityInstance.create!(time_interval: cyclic_interval, activity: activity, room: room, location: location)
  end
  let!(:conflict) do
    Conflict.create!(ts: cyclic_interval.start, is_resolved: false, activity_instance: cyclic_instance)
  end

  before { sign_in admin }

  def react_props_body
    CGI.unescapeHTML(response.body)
  end

  it "renders without raising SystemStackError" do
    expect { get "/plannings/conflict/#{conflict.id}" }.not_to raise_error

    expect(response).to have_http_status(:ok)
  end

  it "still includes the activity data the mounted Planning component reads (activity_ref label)" do
    get "/plannings/conflict/#{conflict.id}"

    expect(react_props_body).to include(activity_ref.label)
  end

  it "does not leak the teacher's authentication_token (a live session credential) into the page" do
    get "/plannings/conflict/#{conflict.id}"

    expect(react_props_body).not_to include(teacher.authentication_token)
    expect(react_props_body).not_to include("authentication_token")
    # but the safe fields the mounted component reads are still there
    expect(react_props_body).to include(teacher.first_name)
  end
end
