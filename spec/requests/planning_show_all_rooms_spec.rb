# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "`/plannings/all_rooms` crashes:
# `show_all_rooms.html.erb` never passes `season`": PlanningController#show_all_rooms didn't set
# @season/@next_season/@seasons (unlike its sibling #show_for_room), so the view never passed a
# `season:` prop to the mounted planning/Planning React component, which reads
# `this.props.season.holidays.length` in its constructor and crashed with a TypeError.
RSpec.describe "GET /plannings/all_rooms", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    example.run
    Rails.cache.delete("current_season")
  end

  let(:admin) do
    FactoryBot.create(
      :user, email: "planning-all-rooms-admin@example.com", first_name: "Admin", last_name: "AllRooms", is_admin: true
    )
  end
  let(:teacher) do
    FactoryBot.create(
      :user, email: "planning-all-rooms-teacher@example.com", first_name: "Teacher", last_name: "AllRooms",
             is_teacher: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind, name: "Instrument") }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano") }
  let(:location) { Location.create!(label: "Site planning all_rooms spec") }
  let(:room) { Room.create!(label: "Salle planning all_rooms spec", location: location) }
  let(:next_season) do
    Season.create!(
      label: "Saison suivante planning all_rooms spec",
      start: 11.days.from_now.beginning_of_day,
      end: 20.days.from_now.end_of_day,
      opening_date_for_applications: 5.days.from_now,
      opening_date_for_new_applications: 6.days.from_now,
      closing_date_for_applications: 10.days.from_now
    )
  end
  let!(:season) do
    Season.create!(
      label: "Saison planning all_rooms spec",
      start: 3.days.ago.beginning_of_day,
      end: 10.days.from_now.end_of_day,
      opening_date_for_applications: 30.days.ago,
      opening_date_for_new_applications: 25.days.ago,
      closing_date_for_applications: 5.days.from_now,
      is_current: true
    ).tap { |s| s.update!(next_season_id: next_season.id) }
  end
  let(:time_interval) do
    TimeInterval.create!(start: 1.day.from_now.change(hour: 10), end: 1.day.from_now.change(hour: 11))
  end
  let!(:activity) do
    act = Activity.create!(
      time_interval: time_interval, activity_ref: activity_ref, room: room, location: location
    )
    TeachersActivity.create!(activity: act, teacher: teacher, is_main: true)
    act
  end

  before { sign_in admin }

  def react_props_body
    CGI.unescapeHTML(response.body)
  end

  it "renders without crashing and passes a season prop with holidays to planning/Planning" do
    get "/plannings/all_rooms"

    expect(response).to have_http_status(:ok)
    expect(react_props_body).to include(%("season":{)).and include(%("holidays":))
  end

  it "assigns @season/@next_season/@seasons the same way #show_for_room does" do
    get "/plannings/all_rooms"

    expect(assigns(:season)).to be_present
    expect(assigns(:season)["holidays"]).to eq([])
    expect(assigns(:next_season)).to be_present
    expect(assigns(:next_season)["id"]).to eq(next_season.id)
    expect(assigns(:seasons)).to be_present
    expect(assigns(:seasons).map { |s| s["id"] }).to contain_exactly(season.id, next_season.id)
  end
end
