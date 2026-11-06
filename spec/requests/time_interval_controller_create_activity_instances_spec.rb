# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "Serializer cycle can SystemStackError when
# rendering a TimeInterval with an activity_instance": TimeIntervalController
# #create_activity_instances (a near-copy of the already-fixed ActivityController#create) built
# its response via `render json: intervals, each_serializer: TimeIntervalSerializer` with no
# `include:` guard, so the app-wide `default_includes = "**"` recurses forever once an interval's
# activity_instance points back to an activity that references that same interval (every created
# instance's activity_instance points back to the activity -- see Activity#create_instances's
# duplicate-avoidance check, which reuses the activity's own time_interval as one of the created
# instances whenever a requested instance falls on the same date).
RSpec.describe "PATCH /time_interval/:id/validate (TimeIntervalController#create_activity_instances)",
              type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) do
    FactoryBot.create(
      :user, email: "time-interval-create-instances-admin@example.com", first_name: "Admin",
             last_name: "CreateInstances", is_admin: true
    )
  end
  let(:teacher) do
    FactoryBot.create(
      :user, email: "time-interval-create-instances-teacher@example.com", first_name: "Teacher",
             last_name: "CreateInstances", is_teacher: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Flute") }
  let(:location) { Location.create!(label: "Batiment create_activity_instances spec") }
  let(:room) { Room.create!(label: "Salle create_activity_instances spec", location: location) }
  let!(:season) do
    Season.create!(
      label: "Saison create_activity_instances spec",
      start: Date.today.beginning_of_day,
      end: 10.days.from_now.end_of_day,
      opening_date_for_applications: 30.days.ago,
      opening_date_for_new_applications: 25.days.ago,
      closing_date_for_applications: 5.days.from_now,
      is_current: true
    )
  end
  let!(:availability) do
    TimeInterval.create!(start: 4.days.from_now.change(hour: 10), end: 4.days.from_now.change(hour: 11),
                         kind: "p", is_validated: false)
  end

  before { sign_in admin }

  # The requested activityInstance falls on the same date as the activity's own (newly set)
  # interval, so Activity#create_instances's duplicate-avoidance check reuses that same interval
  # as the created instance's time_interval -- closing the TimeInterval <-> activity_instance <->
  # Activity cycle.
  def create_activity_instances_params
    {
      activity: {
        availabilityTimeIntervalId: availability.id,
        activityRefId: activity_ref.id,
        roomId: room.id,
        teachers: { teacher.id.to_s => true },
        startTime: availability.start.iso8601,
        endTime: availability.end.iso8601
      },
      activityInstances: [{ start: availability.start.iso8601, end: availability.end.iso8601 }]
    }
  end

  def patch_create_activity_instances
    patch "/time_interval/#{availability.id}/validate", params: create_activity_instances_params, as: :json
  end

  it "renders without raising SystemStackError" do
    expect { patch_create_activity_instances }.not_to raise_error

    expect(response).to have_http_status(:ok)
  end

  it "creates the activity instance cycle and still returns the created interval" do
    expect { patch_create_activity_instances }.to change(ActivityInstance, :count).by(1)

    activity = Activity.last
    expect(activity.time_interval.activity_instance.activity).to eq(activity)

    body = JSON.parse(response.body)
    expect(body.first["id"]).to eq(activity.time_interval.id)
  end
end
