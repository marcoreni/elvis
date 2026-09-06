# frozen_string_literal: true

require "rails_helper"

# Area smoke for feat/i18n-p2-practice-rooms-params (Phase 07 P2): the 6 practice/* Rails-scaffold
# CRUD view sets, locations/*, and the rooms/* ERB chrome had their hardcoded French replaced with
# t() calls (common.actions.* / common.labels.* reuse, activerecord.attributes.<model>.* form
# labels, views.practice.<controller>.<action>.* / views.locations.* page chrome,
# views.shared.form_errors.heading).
#
# This is a P2 *area* smoke, NOT per-string coverage — it renders a handful of representative pages
# in both locales and checks: 200, no leaked "translation missing" marker, a representative
# page-chrome string resolves per-locale, and a reused common.* key renders. Follows the pattern in
# spec/requests/devise_pages_spec.rb and spec/requests/users_pages_spec.rb.
RSpec.describe "Practice / rooms / locations scaffold i18n", type: :request do
  include Devise::Test::IntegrationHelpers

  # Season.current / Season.current_apps_season (app/models/season.rb) cache in Rails.cache, a real
  # FileStore in the test env not cleared by transaction rollback — same guard as
  # spec/requests/users_pages_spec.rb / devise_pages_spec.rb.
  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "practice-scaffold-i18n-admin@example.com", is_admin: true)
  end

  before { sign_in admin }

  representative_pages = [
    "/practice/materials",
    "/practice/materials/new",
    "/practice/room_features/new",
    "/locations"
  ].freeze

  %w[fr en].each do |lng|
    context "in #{lng}" do
      before { cookies[:locale] = lng }

      representative_pages.each do |path|
        it "GET #{path} renders 200 with no missing-translation marker" do
          get path
          expect(response).to have_http_status(:ok)
          expect(CGI.unescapeHTML(response.body)).not_to match(/translation missing/i)
        end
      end

      it "renders the translated practice/materials index page chrome" do
        get "/practice/materials"
        expected = I18n.t("views.practice.materials.index.title", locale: lng)
        expect(CGI.unescapeHTML(response.body)).to include(expected)
      end

      it "renders the translated locations index page chrome" do
        get "/locations"
        expected = I18n.t("views.locations.index.title", locale: lng)
        expect(CGI.unescapeHTML(response.body)).to include(expected)
      end

      it "renders the reused common.actions.save key on the /new form" do
        get "/practice/materials/new"
        expect(CGI.unescapeHTML(response.body)).to include(I18n.t("common.actions.save", locale: lng))
      end
    end
  end

  it "renders distinct fr/en copy for the same key (catches a copy-paste locale bug)" do
    fr = I18n.t("views.practice.materials.index.title", locale: "fr")
    en = I18n.t("views.practice.materials.index.title", locale: "en")
    expect(fr).not_to eq(en)
  end

  # Bare `f.label :attr` must resolve via activerecord.attributes.<model>.* (Rails
  # human_attribute_name), not fall back to "attr".humanize. room_features is the plural model
  # class name (app/models/room_features.rb).
  it "resolves bare f.label form field labels to the French copy, not the humanized attr name" do
    cookies[:locale] = "fr"

    get "/practice/materials/new"
    expect(response).to have_http_status(:ok)
    expect(CGI.unescapeHTML(response.body)).to include(
      I18n.t("activerecord.attributes.material.name", locale: "fr")
    )

    get "/practice/room_features/new"
    expect(response).to have_http_status(:ok)
    body = CGI.unescapeHTML(response.body)
    expect(body).to include(I18n.t("activerecord.attributes.room_features.name", locale: "fr"))
    expect(body).not_to include(">Name<")
  end
end
