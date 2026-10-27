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

  def post_overlap(teacher_id:)
    post "/planning/overlap", params: {
      teacher_id: teacher_id,
      room_id: nil,
      startTime: 1.day.from_now.change(hour: 10),
      endTime: 1.day.from_now.change(hour: 11),
      time_interval_id: nil
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
end
