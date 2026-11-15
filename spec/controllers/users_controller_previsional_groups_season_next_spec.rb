# frozen_string_literal: true

require "rails_helper"

# Regression coverage for docs/KnownIssues.md's "Season.next crashes with NoMethodError when no
# season is flagged is_current": #previsional_groups assigned @season = Season.next with no guard,
# and the view read @season["label"] unconditionally -- nil["label"] raises NoMethodError, same
# root cause one level removed into the template.
RSpec.describe UsersController, type: :controller do
  include Devise::Test::ControllerHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "season-next-previsional-admin@example.com", is_admin: true,
                             first_name: "Admin", last_name: "Season")
  end
  let(:teacher) do
    FactoryBot.create(:user, email: "season-next-previsional-teacher@example.com", is_teacher: true,
                             first_name: "Teacher", last_name: "Season")
  end

  before { sign_in admin }

  describe "GET #previsional_groups" do
    it "redirects instead of raising when there is no next season" do
      get :previsional_groups, params: { id: teacher.id }

      expect(response).to redirect_to(root_path)
      expect(flash[:alert]).to be_present
    end
  end
end
