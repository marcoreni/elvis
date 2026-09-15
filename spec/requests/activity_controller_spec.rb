# frozen_string_literal: true

require "rails_helper"

# Regression coverage for ActivityController#list (POST /activities.json): a rubocop
# safe-autocorrect commit (4709712c) collapsed the original
# `if admin / elsif allowed-teacher / else redirect` branching into a single `if admin` block
# that unconditionally redirected every admin to root instead of rendering JSON -- the empty
# `elsif` body (a deliberate "explicitly allowed, nothing extra to do" branch) confused the
# autocorrecter. Exercises all three branches directly against the real controller action rather
# than just asserting the redirect is gone.
RSpec.describe "POST /activities.json", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "activity-spec-admin@example.com", is_admin: true) }
  let(:allowed_teacher) { FactoryBot.create(:user, email: "activity-spec-teacher-ok@example.com", is_teacher: true) }
  let(:disallowed_teacher) do
    FactoryBot.create(:user, email: "activity-spec-teacher-no@example.com", is_teacher: true)
  end
  let(:regular_user) { FactoryBot.create(:user, email: "activity-spec-user@example.com") }

  around do |example|
    Rails.cache.delete("parameter_teachers.teacher_can_manage_courses")
    example.run
    Rails.cache.delete("parameter_teachers.teacher_can_manage_courses")
  end

  def post_activities_list
    post "/activities.json", params: { filtered: [], page: 0, page_size: 20 }, as: :json
  end

  context "as an admin" do
    before { sign_in admin }

    it "renders JSON instead of redirecting" do
      post_activities_list

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("application/json")
    end
  end

  context "as a teacher allowed to manage courses" do
    before do
      Parameter.create!(label: "teachers.teacher_can_manage_courses", value_type: "boolean", value: "true")
      sign_in allowed_teacher
    end

    it "renders JSON instead of redirecting" do
      post_activities_list

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("application/json")
    end
  end

  context "as a teacher without the manage-courses permission" do
    before do
      Parameter.create!(label: "teachers.teacher_can_manage_courses", value_type: "boolean", value: "false")
      sign_in disallowed_teacher
    end

    it "redirects to root instead of rendering JSON" do
      post_activities_list

      expect(response).to redirect_to(root_path)
    end
  end

  context "as a non-admin, non-teacher user" do
    before { sign_in regular_user }

    it "redirects to root instead of rendering JSON" do
      post_activities_list

      expect(response).to redirect_to(root_path)
    end
  end
end
