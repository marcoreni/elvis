# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "`PlanningController#overlap`'s teacher
# conflict check 404s for a `teacher_id` of `0`": `TimeInterval.with_teacher` used to call
# `User.find(teacher_id)`, which raises `ActiveRecord::RecordNotFound` for the `0` fallback id
# sent by `ActivityDetailsModal.jsx` for a room planning with no assigned teacher.
RSpec.describe "POST /planning/overlap", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) do
    FactoryBot.create(
      :user, email: "planning-overlap-admin@example.com", first_name: "Admin", last_name: "Overlap", is_admin: true
    )
  end

  before { sign_in admin }

  # time_interval_id defaults to 0 (never a real id), not nil: the controller excludes candidates
  # via `time_intervals.id != ?`, and in Postgres that comparison against a literal NULL is NULL
  # (falsy) for every row, which would vacuously exclude everything regardless of whether
  # `with_teacher`/`in_room` work at all.
  def post_overlap(teacher_id:, start_time: 1.day.from_now.change(hour: 10), end_time: 1.day.from_now.change(hour: 11),
                   time_interval_id: 0)
    post "/planning/overlap", params: {
      teacher_id: teacher_id,
      room_id: nil,
      startTime: start_time,
      endTime: end_time,
      time_interval_id: time_interval_id
    }
  end

  it "returns 200 with a nil teacher instead of 404 when teacher_id is 0" do
    post_overlap(teacher_id: 0)

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to eq("teacher" => nil, "room" => nil)
  end

  it "still returns 200 for a real teacher id with no conflicting interval" do
    teacher = FactoryBot.create(
      :user, email: "planning-overlap-teacher@example.com", first_name: "Teacher", last_name: "Overlap",
             is_teacher: true
    )

    post_overlap(teacher_id: teacher.id)

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to eq("teacher" => nil, "room" => nil)
  end

  it "returns a non-nil teacher when a real conflicting interval exists on the teacher's planning" do
    teacher = FactoryBot.create(
      :user, email: "planning-overlap-teacher-conflict@example.com", first_name: "TeacherConflict",
             last_name: "Overlap", is_teacher: true
    )
    planning = Planning.create!(user: teacher)
    conflicting_interval = TimeInterval.create!(
      start: 1.day.from_now.change(hour: 10), end: 1.day.from_now.change(hour: 11)
    )
    planning.time_intervals << conflicting_interval

    post_overlap(
      teacher_id: teacher.id,
      start_time: 1.day.from_now.change(hour: 10, min: 30),
      end_time: 1.day.from_now.change(hour: 11, min: 30)
    )

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["teacher"]).not_to be_nil
    expect(body["teacher"]["id"]).to eq(conflicting_interval.id)
  end
end
