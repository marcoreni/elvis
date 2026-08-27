require "rails_helper"

# Regression coverage for feature/i18n-04-devise-and-public-pages: these pages had their French
# copy replaced with I18n keys, and a typo'd/missing key silently renders as
# "translation missing: ..." instead of failing a build — these specs render each live Devise
# page in both locales and check for real, expected copy instead.
RSpec.describe "Devise pages", type: :request do
  # Season.current_apps_season (app/models/season.rb) caches in Rails.cache, which is a real
  # FileStore in the test env and isn't cleared by DatabaseCleaner's transaction rollback — see
  # the same pattern in spec/controllers/application_controller_spec.rb.
  around do |example|
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_apps_season")
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

  describe "GET /u/sign_in" do
    include_examples "a page translated in both locales", "/u/sign_in",
      "Accédez à votre espace", "Access your account"
  end

  describe "GET /u/sign_up" do
    include_examples "a page translated in both locales", "/u/sign_up",
      "Votre Nom", "Your last name"
  end

  describe "GET /u/password/new" do
    include_examples "a page translated in both locales", "/u/password/new",
      "Réinitialisation par Email", "Reset by Email"
  end

  describe "GET /u/password/edit" do
    it "renders the reset-password form" do
      get "/u/password/edit", params: { reset_password_token: "bogus-token" }
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Changez votre mot de passe")
    end
  end

  describe "GET /pick_user/:id" do
    it "renders the account picker for the given user" do
      user = FactoryBot.create(:user, email: "pick-user-spec@example.com")

      get "/pick_user/#{user.id}"

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Se connecter")
    end
  end

  it "never leaks a raw missing-translation marker on any of these pages" do
    ["/u/sign_in", "/u/sign_up", "/u/password/new"].each do |path|
      get path
      expect(response.body).not_to include("translation missing")
    end
  end
end
