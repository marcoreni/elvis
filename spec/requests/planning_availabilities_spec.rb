# frozen_string_literal: true

require "rails_helper"

# Regression coverage for docs/KnownIssues.md's "parameters/planning_parameters#tab-0" entry:
#   - "Error while fetching the availabilities" on load (GET /planning/:id/intervals/:granularity/:date)
#   - PATCH /plannings/availabilities/:id 500s
#
# Both symptoms traced back to the same shape of bug: a missing/invalid id (planning, season) or
# a missing optional Parameter row fell through to an unrescued exception (ActiveRecord::
# RecordNotFound / NoMethodError / ActiveRecord::RecordInvalid), which -- for a JSON request --
# Rails' default exception app renders as an HTML error page, not JSON. frontend/tools/api.ts's
# handleResponse always calls `response.json()` on a non-ok response regardless of content type,
# so an HTML body there rejects with a parse error, which SchoolAvailabilities.tsx's generic
# `.error()` handler surfaces as "Error while fetching the availabilities".
#
# The fix (app/controllers/planning_controller.rb, app/services/time_intervals/
# availabilities_utils.rb) makes every one of these cases return `{ errors: [...] }` JSON with a
# real 4xx status instead.
RSpec.describe "Planning availabilities endpoints", type: :request do
  include Devise::Test::IntegrationHelpers

  # Season.current_apps_season caches in Rails.cache, a real FileStore in the test env that
  # DatabaseCleaner's rollback does not touch -- same guard as other request specs touching Season.
  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "planning-availabilities-admin@example.com", is_admin: true)
  end

  let(:planning) { Planning.create! }

  before { sign_in admin }

  describe "GET /planning/:id/intervals/:granularity/:date (PlanningController#get_intervals)" do
    it "returns { intervals: [...] } as JSON for a real planning" do
      get "/planning/#{planning.id}/intervals/week/2026-01-05"

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("application/json")
      body = JSON.parse(response.body)
      expect(body).to have_key("intervals")
    end

    it "returns a 4xx JSON { errors: [...] } body, not a 500 or an HTML page, for a planning id that doesn't exist" do
      get "/planning/999999/intervals/week/2026-01-05"

      expect(response).to have_http_status(:not_found)
      expect(response.media_type).to eq("application/json")
      body = JSON.parse(response.body)
      expect(body["errors"]).to be_an(Array).and be_present
    end

    it "returns the same JSON error shape for a non-numeric id " \
       "(what the frontend sends when School#planning_id is nil)" do
      # SchoolAvailabilities.tsx builds this url from `@school.planning_id`, which is nil on any
      # School created without a planning (see app/controllers/admin_controller.rb's
      # `School.create` -- no planning_id is ever assigned there).
      get "/planning/undefined/intervals/week/2026-01-05"

      expect(response).to have_http_status(:not_found)
      body = JSON.parse(response.body)
      expect(body["errors"]).to be_an(Array).and be_present
    end
  end

  describe "PATCH /plannings/availabilities/:id (PlanningController#update_availabilities)" do
    let!(:season) do
      Season.create!(
        label: "2025-2026",
        start: 2.years.ago, end: 1.year.from_now,
        opening_date_for_applications: 3.years.ago,
        opening_date_for_new_applications: 30.months.ago,
        closing_date_for_applications: 6.months.from_now,
        is_current: true
      )
    end

    def patch_availabilities(
      id:, from: "2026-01-05T08:00:00+01:00", to: "2026-01-05T09:00:00+01:00",
      season_id: season.id, comment: nil
    )
      patch "/plannings/availabilities/#{id}",
            params: { from: from, to: to, season_id: season_id, comment: comment }.compact, as: :json
    end

    it "creates the availability and returns { intervals: [...] } on success" do
      patch_availabilities(id: planning.id)

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["intervals"].length).to eq(1)
    end

    it "succeeds with no INTERVAL_STEPS Parameter row " \
       "(regression: step_param.nil? was checked AFTER step_param.parse, a dead guard that NoMethodError'd)" do
      expect(Parameter.find_by_label("INTERVAL_STEPS")).to be_nil

      patch_availabilities(id: planning.id)

      expect(response).to have_http_status(:ok)
    end

    it "returns 400 { errors: [...] }, not a 500, when the planning does not exist" do
      patch_availabilities(id: 999_999)

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)
      expect(body["errors"]).to be_an(Array).and be_present
    end

    it "returns 400 { errors: [...] }, not a 500, when season_id is omitted and there is no current apps season" do
      season.update!(is_current: false)
      Rails.cache.delete("current_season")
      Rails.cache.delete("current_apps_season")

      patch "/plannings/availabilities/#{planning.id}",
            params: { from: "2026-01-05T08:00:00+01:00", to: "2026-01-05T09:00:00+01:00" }, as: :json

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)
      expect(body["errors"]).to be_an(Array).and be_present
    end

    it "returns 400 { errors: [...] }, not a 500, when a comment is given but the planning has no associated user" do
      # School-level availability plannings (as opposed to a teacher's own) have no user --
      # Planning#user is optional -- so Comment's required belongs_to :user can't be satisfied.
      patch_availabilities(id: planning.id, comment: "Indisponible toute la journée")

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)
      expect(body["errors"]).to be_an(Array).and be_present
    end

    it "creates the comment when the planning does have an associated user" do
      teacher = FactoryBot.create(:user, email: "planning-availabilities-teacher@example.com",
                                         first_name: "Jean", last_name: "Dupont", is_teacher: true)
      teacher_planning = Planning.create!(user: teacher)

      patch_availabilities(id: teacher_planning.id, comment: "Indisponible toute la journée")

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["intervals"].first.dig("comment", "content")).to eq("Indisponible toute la journée")
    end
  end

  describe "PATCH /plannings/availabilities/:id/can_update (PlanningController#can_update_availabilities)" do
    let!(:season) do
      Season.create!(
        label: "2025-2026",
        start: 2.years.ago, end: 1.year.from_now,
        opening_date_for_applications: 3.years.ago,
        opening_date_for_new_applications: 30.months.ago,
        closing_date_for_applications: 6.months.from_now,
        is_current: true
      )
    end

    it "returns 400 { errors: [...] }, not a 500, when the planning does not exist" do
      patch "/plannings/availabilities/999999/can_update",
            params: { from: "2026-01-05T08:00:00+01:00", to: "2026-01-05T09:00:00+01:00", season_id: season.id },
            as: :json

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)
      expect(body["errors"]).to be_an(Array).and be_present
    end
  end
end
