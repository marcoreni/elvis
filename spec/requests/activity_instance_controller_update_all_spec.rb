# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "Serializer cycle can SystemStackError when
# rendering a TimeInterval with an activity_instance": ActivityInstanceController#update_all built
# its response via `ActiveModel::SerializableResource.new(tis, each_serializer:
# TimeIntervalSerializer)` with no `include:` guard, so the app-wide `default_includes = "**"`
# recurses forever once an interval's activity_instance points back to an activity that
# references that same interval (see Activity#create_instances's duplicate-avoidance check).
RSpec.describe "PATCH /activity_instance/:id/update_all/:time_interval_id", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) do
    FactoryBot.create(
      :user, email: "activity-instance-update-all-admin@example.com", first_name: "Admin", last_name: "UpdateAll",
             is_admin: true
    )
  end
  let(:teacher) do
    FactoryBot.create(
      :user, email: "activity-instance-update-all-teacher@example.com", first_name: "Teacher", last_name: "UpdateAll",
             is_teacher: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Violon") }
  let(:location) { Location.create!(label: "Batiment update_all spec") }
  let(:room) { Room.create!(label: "Salle update_all spec", location: location) }
  let!(:season) do
    Season.create!(
      label: "Saison update_all spec",
      start: Date.today.beginning_of_day,
      end: 10.days.from_now.end_of_day,
      opening_date_for_applications: 30.days.ago,
      opening_date_for_new_applications: 25.days.ago,
      closing_date_for_applications: 5.days.from_now,
      is_current: true
    )
  end

  # The Activity's own interval, reused later by one of its own activity_instances -- this is the
  # cycle-closing edge: TimeInterval#activity_instance -> ActivityInstance#activity ->
  # Activity#time_interval loops back to this same record.
  let!(:cyclic_interval) do
    TimeInterval.create!(start: 9.days.from_now.change(hour: 10), end: 9.days.from_now.change(hour: 11),
                         kind: "c", is_validated: true)
  end
  # A second, non-cyclic instance of the same activity, earlier in the week -- this is the one the
  # request targets; `update_all` then pulls the (later, cyclic) sibling instance into the
  # response via Activity#activity_instances.
  let!(:other_interval) do
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
  let!(:other_instance) do
    ActivityInstance.create!(time_interval: other_interval, activity: activity, room: room, location: location)
  end

  before { sign_in admin }

  def patch_update_all
    patch "/activity_instance/#{other_instance.id}/update_all/#{other_interval.id}"
  end

  it "renders without raising SystemStackError" do
    expect { patch_update_all }.not_to raise_error

    expect(response).to have_http_status(:ok)
  end

  it "still includes the activity data Planning.jsx's handleUpdateAllActivityInstances reads" do
    patch_update_all

    body = JSON.parse(response.body)
    returned_interval = body["intervals"].find { |i| i["id"] == cyclic_interval.id }

    expect(returned_interval.dig("activity_instance", "activity", "activity_ref", "label")).to eq(activity_ref.label)
  end
end
