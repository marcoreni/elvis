# frozen_string_literal: true

require "rails_helper"

# Regression coverage for docs/KnownIssues.md's "Season.next crashes with NoMethodError when no
# season is flagged is_current": Season.next used to raise (current.next_season_id on a nil
# current), which these actions then called .start/.end/etc on unconditionally. Season.next is
# now nil-safe itself, and each of these actions guards against a nil result instead of 500ing.
RSpec.describe PlanningController, type: :controller do
  include Devise::Test::ControllerHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) { FactoryBot.create(:user, email: "season-next-admin@example.com", is_admin: true) }
  let(:teacher) do
    FactoryBot.create(:user, email: "season-next-teacher@example.com", is_teacher: true,
                             first_name: "Camille", last_name: "Martin")
  end
  let(:planning) { Planning.create!(user: teacher) }

  before { sign_in admin }

  # No Season at all in any of these examples -- Season.current and Season.next are both nil.

  describe "GET #show_generic" do
    it "redirects instead of raising when there is no next season" do
      get :show_generic, params: { id: planning.id }

      expect(response).to redirect_to(root_path)
      expect(flash[:alert]).to be_present
    end
  end

  describe "GET #show_availabilities_for_date" do
    it "redirects instead of raising when asking for the default (dateless) week with no next season" do
      get :show_availabilities_for_date, params: { id: planning.id }

      expect(response).to redirect_to(root_path)
      expect(flash[:alert]).to be_present
    end

    it "does not need a next season when a real date param is given" do
      # Season.current is read unconditionally later in this action (date_for_teacher_planning_
      # validation) regardless of the :date param -- unrelated to Season.next, so give it a real
      # current season to isolate what this example is actually testing.
      Season.create!(label: "2026-2027", start: Date.current, end: Date.current + 10.months,
                      is_current: true, opening_date_for_applications: Date.current - 2.months,
                      opening_date_for_new_applications: Date.current - 1.month,
                      closing_date_for_applications: Date.current + 2.months)

      get :show_availabilities_for_date, params: { id: planning.id, date: Date.current.to_s }

      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST #copy_availabilities" do
    it "redirects instead of raising when there is no next season" do
      post :copy_availabilities, params: { id: planning.id }

      expect(response).to redirect_to(availabilities_planning_path(planning.id))
      expect(flash[:alert]).to be_present
    end
  end
end
