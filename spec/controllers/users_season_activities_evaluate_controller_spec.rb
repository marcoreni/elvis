# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry documenting the season_activities/evaluate
# serializer unification: both actions used to build @activities_json/@activities/@activity_json/
# @evaluations_json from raw Model.as_json(include: {...}) trees that had drifted from the
# ActiveModel::Serializer used for the same models elsewhere in the app (ActivityRefSerializer
# missing is_work_group/activity_ref_kind_id, ActivitySerializer missing activity_ref_id/
# time_interval/student_evaluations). They now go through ActivitySerializer/StudentEvaluationSerializer,
# extended to cover exactly what frontend/components/evaluation/** actually reads.
RSpec.describe UsersController, type: :controller do
  include Devise::Test::ControllerHelpers

  around do |example|
    Rails.cache.delete("current_season")
    example.run
    Rails.cache.delete("current_season")
  end

  let(:admin) { FactoryBot.create(:user, email: "serializer-scope-admin@example.com", is_admin: true) }
  let(:teacher) do
    FactoryBot.create(
      :user, email: "serializer-scope-teacher@example.com", first_name: "Jean", last_name: "Dupont", is_teacher: true
    )
  end
  let(:student) do
    FactoryBot.create(:user, email: "serializer-scope-student@example.com", first_name: "Camille", last_name: "Martin")
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind, name: "Instrument") }
  let(:activity_ref) do
    FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano", is_work_group: true)
  end
  let(:location) { Location.create!(label: "Bâtiment principal") }
  let(:room) { Room.create!(label: "Salle 1", location: location) }
  let(:current_season) do
    Season.create!(
      label: "2025-2026",
      start: DateTime.new(2025, 9, 1), end: DateTime.new(2026, 6, 30),
      opening_date_for_applications: DateTime.new(2025, 7, 1),
      opening_date_for_new_applications: DateTime.new(2025, 8, 1),
      closing_date_for_applications: DateTime.new(2025, 10, 1),
      is_current: true
    )
  end
  let(:next_season) do
    Season.create!(
      label: "2026-2027",
      start: DateTime.new(2026, 9, 1), end: DateTime.new(2027, 6, 30),
      opening_date_for_applications: DateTime.new(2026, 7, 1),
      opening_date_for_new_applications: DateTime.new(2026, 8, 1),
      closing_date_for_applications: DateTime.new(2026, 10, 1)
    )
  end
  let(:time_interval) do
    TimeInterval.create!(start: DateTime.new(2025, 9, 15, 14, 0), end: DateTime.new(2025, 9, 15, 15, 0))
  end
  let!(:activity) do
    current_season.update!(next_season_id: next_season.id)
    act = Activity.create!(
      time_interval: time_interval, activity_ref: activity_ref, room: room, location: location, group_name: "Groupe A"
    )
    TeachersActivity.create!(activity: act, teacher: teacher, is_main: true)
    act.students.create!(user: student)
    act
  end

  before { sign_in admin }

  describe "GET #season_activities" do
    it "returns 200 and serves activities/activity_ref through ActivitySerializer/ActivityRefSerializer" do
      get :season_activities, params: { id: teacher.id }

      expect(response).to have_http_status(:ok)

      activities_json = assigns(:activities_json)
      expect(activities_json.length).to eq(1)

      act_json = activities_json.first
      expect(act_json[:id]).to eq(activity.id)
      expect(act_json[:activity_ref_id]).to eq(activity_ref.id)
      expect(act_json[:time_interval][:id]).to eq(time_interval.id)

      ref_json = act_json[:activity_ref]
      expect(ref_json[:is_work_group]).to eq(true)
      expect(ref_json[:activity_ref_kind_id]).to eq(activity_ref_kind.id)
      expect(ref_json[:activity_ref_kind][:name]).to eq("Instrument")

      user_json = act_json[:users].first
      expect(user_json[:id]).to eq(student.id)

      # referenceData.activities reuses the same ActivitySerializer-backed payload.
      expect(assigns(:activities)).to eq(activities_json)
    end
  end

  describe "GET #evaluate" do
    it "returns 200 and serves activity/evaluations through ActivitySerializer/StudentEvaluationSerializer" do
      get :evaluate, params: { id: teacher.id, activity_id: activity.id }

      expect(response).to have_http_status(:ok)

      activity_json = assigns(:activity_json)
      expect(activity_json[:id]).to eq(activity.id)
      expect(activity_json[:activity_ref_id]).to eq(activity_ref.id)
      expect(activity_json[:activity_ref][:is_work_group]).to eq(true)
      expect(activity_json[:activity_ref][:activity_ref_kind][:name]).to eq("Instrument")
      expect(activity_json[:users].first[:id]).to eq(student.id)

      expect(assigns(:evaluations_json)).to eq([])
    end
  end
end
