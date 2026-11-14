# frozen_string_literal: true

require "rails_helper"

# Regression coverage for a second entry point into the TimeInterval <-> activity_instance <->
# Activity serializer cycle (see Activity.evaluation_include_tree /
# TimeInterval.planning_include_tree): this one is entered from ActivitySerializer's own
# `has_one :time_interval` rather than from TimeIntervalSerializer, at
# UsersController#season_activities/#evaluate (which build @activities_json/@activities/
# @activity_json via `each_serializer: ActivitySerializer` with no `include:` guard before this
# fix). An activity_instance whose time_interval is the same record as its Activity's own
# time_interval (Activity#create_instances's duplicate-avoidance check) closes the cycle:
# ActivitySerializer -> time_interval -> TimeIntervalSerializer -> activity_instance ->
# ActivityInstanceSerializer -> activity -> ActivitySerializer -> ...
RSpec.describe UsersController, type: :controller do
  include Devise::Test::ControllerHelpers

  around do |example|
    Rails.cache.delete("current_season")
    example.run
    Rails.cache.delete("current_season")
  end

  let(:admin) { FactoryBot.create(:user, email: "serializer-cycle-admin@example.com", is_admin: true) }
  let(:teacher) do
    FactoryBot.create(
      :user, email: "serializer-cycle-teacher@example.com", first_name: "Jean", last_name: "Dupont", is_teacher: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind, name: "Instrument") }
  let(:activity_ref) do
    FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano")
  end
  let(:location) { Location.create!(label: "Bâtiment cycle spec") }
  let(:room) { Room.create!(label: "Salle cycle spec", location: location) }
  let(:next_season) do
    Season.create!(
      label: "Saison serializer cycle spec (suivante)",
      start: 11.days.from_now.beginning_of_day,
      end: 20.days.from_now.end_of_day,
      opening_date_for_applications: 5.days.from_now,
      opening_date_for_new_applications: 6.days.from_now,
      closing_date_for_applications: 10.days.from_now
    )
  end
  let!(:current_season) do
    Season.create!(
      label: "Saison serializer cycle spec",
      start: Date.today.beginning_of_day,
      end: 10.days.from_now.end_of_day,
      opening_date_for_applications: 30.days.ago,
      opening_date_for_new_applications: 25.days.ago,
      closing_date_for_applications: 5.days.from_now,
      is_current: true
    ).tap { |s| s.update!(next_season_id: next_season.id) }
  end

  # The cyclic interval: it's both the Activity's own `time_interval` and the `time_interval` of
  # one of that Activity's `activity_instance`s.
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

  before { sign_in admin }

  describe "GET #season_activities" do
    it "renders without raising SystemStackError and keeps time_interval/users data" do
      expect { get :season_activities, params: { id: teacher.id } }.not_to raise_error

      expect(response).to have_http_status(:ok)

      act_json = assigns(:activities_json).find { |a| a[:id] == activity.id }
      expect(act_json[:time_interval][:id]).to eq(cyclic_interval.id)
      expect(act_json).not_to have_key(:activity_instances)
    end
  end

  describe "GET #evaluate" do
    it "renders without raising SystemStackError and keeps time_interval/activity_ref data" do
      expect do
        get :evaluate, params: { id: teacher.id, activity_id: activity.id }
      end.not_to raise_error

      expect(response).to have_http_status(:ok)

      activity_json = assigns(:activity_json)
      expect(activity_json[:id]).to eq(activity.id)
      expect(activity_json[:time_interval][:id]).to eq(cyclic_interval.id)
      expect(activity_json[:activity_ref][:activity_ref_kind][:name]).to eq("Instrument")
    end
  end
end
