# frozen_string_literal: true

require "rails_helper"

# Regression coverage for feature/i18n-05-extract-users: app/views/users/index.html.erb and
# app/views/users/show.html.erb had their French copy replaced with I18n keys. Follows the same
# pattern as spec/requests/devise_pages_spec.rb — render each page in both locales and assert on
# real translated copy in response.body, plus a guard against a leaked "translation missing"
# marker.
RSpec.describe "Users pages", type: :request do
  include Devise::Test::IntegrationHelpers

  # Season.current / Season.current_apps_season (app/models/season.rb) cache in Rails.cache, which
  # is a real FileStore in the test env and isn't cleared by DatabaseCleaner's transaction
  # rollback — see the same pattern in spec/requests/devise_pages_spec.rb and
  # spec/controllers/application_controller_spec.rb.
  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "users-pages-spec-admin@example.com", is_admin: true)
  end

  shared_examples "a page translated in both locales" do |path, fr_text, en_text|
    it "renders in French by default" do
      get path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include(fr_text)
    end

    it "renders in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include(en_text)
    end
  end

  describe "GET /users" do
    before { sign_in admin }

    include_examples "a page translated in both locales", "/users",
                     "Liste des utilisateurs", "User list"
  end

  describe "GET /users/:id" do
    before { sign_in admin }

    it "renders the profile page in French by default" do
      get "/users/#{admin.id}"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Liens familiaux")
    end

    it "renders the profile page in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get "/users/#{admin.id}"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Family links")
    end
  end

  describe "GET /users/new" do
    before { sign_in admin }

    include_examples "a page translated in both locales", "/users/new",
                     "Créer un nouvel utilisateur", "Create a new user"

    it "translates the is_admin/is_teacher/adherent checkbox labels via the reused activerecord attribute keys" do
      get "/users/new"
      expect(response.body).to include("Administrateur").and include("Professeur").and include("Adhérent")

      cookies[:locale] = "en"
      get "/users/new"
      expect(response.body).to include("Administrator").and include("Teacher").and include("Member")
    end
  end

  it "never leaks a raw missing-translation marker on any of these pages" do
    sign_in admin
    ["/users", "/users/#{admin.id}", "/users/new"].each do |path|
      get path
      expect(response.body).not_to include("translation missing")
    end
  end
end
