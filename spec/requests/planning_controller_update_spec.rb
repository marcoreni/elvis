# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "Serializer cycle can SystemStackError when
# rendering a TimeInterval with an activity_instance": PlanningController#update built its
# response via `ActiveModelSerializers::SerializableResource.new(intervals, each_serializer:
# TimeIntervalSerializer)` with no `include:` guard, so the app-wide `default_includes = "**"`
# recurses forever once an interval's activity_instance points back to an activity that
# references that same interval (see Activity#create_instances's duplicate-avoidance check).
RSpec.describe "PATCH /planning/:id (PlanningController#update)", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) do
    FactoryBot.create(
      :user, email: "planning-update-admin@example.com", first_name: "Admin", last_name: "Update", is_admin: true
    )
  end
  let(:teacher) do
    FactoryBot.create(
      :user, email: "planning-update-teacher@example.com", first_name: "Teacher", last_name: "Update",
             is_teacher: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Guitare") }
  let(:location) { Location.create!(label: "Batiment update spec") }
  let(:room) { Room.create!(label: "Salle update spec", location: location) }
  let!(:season) do
    Season.create!(
      label: "Saison update spec",
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
  let(:planning) { Planning.create! }

  before { sign_in admin }

  def patch_update
    patch "/planning/#{planning.id}", params: {
      intervals: [
        {
          id: cyclic_interval.id,
          isNew: false,
          start: cyclic_interval.start.iso8601,
          end: cyclic_interval.end.iso8601,
          kind: cyclic_interval.kind,
          is_validated: true
        }
      ],
      seasonId: season.id
    }, as: :json
  end

  it "renders without raising SystemStackError" do
    expect { patch_update }.not_to raise_error

    expect(response).to have_http_status(:ok)
  end

  it "still includes the activity data Planning.jsx's commitIntervals reads (activity_ref label)" do
    patch_update

    body = JSON.parse(response.body)
    returned_interval = body["intervals"].find { |i| i["id"] == cyclic_interval.id }

    expect(returned_interval.dig("activity_instance", "activity", "activity_ref", "label")).to eq(activity_ref.label)
  end

  it "does not leak the teacher's authentication_token (a live session credential) in the JSON response" do
    patch_update

    body = JSON.parse(response.body)
    returned_interval = body["intervals"].find { |i| i["id"] == cyclic_interval.id }
    teacher_json = returned_interval.dig("activity_instance", "activity", "teacher")

    expect(teacher_json).not_to be_nil
    expect(teacher_json).not_to have_key("authentication_token")
    expect(teacher_json["first_name"]).to eq(teacher.first_name)
  end
end
