# frozen_string_literal: true

require "rails_helper"

# Area smoke for feat/i18n-p7-oauth-legal-pages (I18n Roadmap Phase 07 P7, final checkpoint PR):
# oidc/authorizations (OAuth consent screen), errors/base_renderer_error, cgu/index,
# static_pages/{about,landing}, admin/edit_mail_settings, settings/plugin and events_rules/index
# all had their ERB chrome extracted to I18n keys.
#
# This is the P7 *area* smoke, NOT per-string coverage, and it only exercises the pages that are
# actually routed and reachable without extra fixtures:
#
# - /cgu (CguController#index, `skip_before_action :authenticate_user!`) is live and simple to
#   hit -- covered below in both locales.
# - /events_rules (EventsRulesController#index) is live, requires a signed-in user, and needs no
#   extra fixtures (@template_names is just NotificationTemplate.all, empty is fine) -- covered
#   below in both locales.
# - static_pages#about / #landing and admin#edit_mail_settings are extracted but currently
#   unrouted/dead (confirmed against config/routes.rb) -- deliberately NOT tested here, they 404.
# - settings#plugin (views.settings.plugin.*) is routed, but SettingsController#plugin renders
#   `render template: @plugin.partial` -- an arbitrary plugin-supplied partial that doesn't exist
#   in core app/views. Exercising it would mean fabricating a whole configurable plugin (a
#   Plugin record plus a real partial template) purely for a checkpoint smoke test, which is more
#   setup than this lean checkpoint warrants -- skipped.
# - oidc/authorizations#new (the OAuth consent screen, views.oidc/authorizations.new.*) is
#   skipped: `Oidc::AuthorizationsController` isn't defined anywhere in this checkout (it ships
#   from a private plugin gem resolved via plugins.json/GITHUB_TOKEN, unavailable in this
#   environment), and even where it is available, rendering `new` for real needs a registered
#   OAuth application plus a valid in-flight authorization request (client_id, redirect_uri,
#   response_type, scope) that only a real Doorkeeper/OIDC handshake produces. That's well beyond
#   a lean checkpoint smoke test, so the consent screen's fr/en copy is spot-checked directly
#   against config/locales/{fr,en}.yml instead of rendering the page.
# - errors/base_renderer_error is a rescue-only template (rendered from
#   ApplicationController's `rescue_from BaseRendererError`), not reachable via a plain GET --
#   its heading is likewise spot-checked directly against the locale files.
#
# Mirrors spec/requests/seasons_adhesion_i18n_spec.rb / activity_application_statuses_i18n_spec.rb.
RSpec.describe "OAuth consent / legal pages i18n (P7)", type: :request do
  include Devise::Test::IntegrationHelpers

  # Season.current / Season.current_apps_season (app/models/season.rb) cache in Rails.cache, a
  # real FileStore in the test env not cleared by transaction rollback -- same guard as the other
  # spec/requests/*_i18n_spec.rb files.
  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let!(:school) { School.create!(name: "École de Test") }

  let(:admin) do
    FactoryBot.create(:user, email: "p7-oauth-legal-i18n-admin@example.com", is_admin: true)
  end

  before { sign_in admin }

  # path => I18n key of the heading rendered on that page
  pages = {
    "/cgu" => "views.cgu.index.title",
    "/events_rules" => "views.events_rules.index.heading"
  }.freeze

  %w[fr en].each do |lng|
    context "in #{lng}" do
      before { cookies[:locale] = lng }

      pages.each do |path, heading_key|
        it "GET #{path} renders 200 with the #{lng} heading and no missing-translation marker" do
          get path
          expect(response).to have_http_status(:ok)

          body = CGI.unescapeHTML(response.body)
          expect(body).to include(I18n.t(heading_key, locale: lng))
          expect(body).not_to match(/translation missing/i)
        end
      end
    end
  end

  it "has genuinely distinct fr/en copy for the sampled headings (catches a copy-paste locale bug)" do
    pages.each_value do |key|
      expect(I18n.t(key, locale: "fr")).not_to eq(I18n.t(key, locale: "en"))
    end
  end

  # /cgu interpolates the school name into several keys via `%{school_name}` -- render it once
  # more and assert the interpolation actually landed in the body, so a dropped `school_name:`
  # kwarg (which would surface as "translation missing: ... missing interpolation argument")
  # can't slip through unnoticed.
  it "interpolates the school name into the /cgu GDPR intro" do
    cookies[:locale] = "fr"
    get "/cgu"
    expect(response).to have_http_status(:ok)

    body = CGI.unescapeHTML(response.body)
    expect(body).to include(I18n.t("views.cgu.index.gdpr_intro", school_name: school.name, locale: "fr"))
  end

  # oidc/authorizations#new and errors/base_renderer_error aren't reachable via a plain GET (see
  # the module comment above for why) -- spot-check their extracted copy directly against the
  # locale files instead of skipping their coverage outright.
  it "has distinct fr/en copy for the OAuth consent screen and the error heading, with real interpolation" do
    consent_fr = I18n.t("views.oidc/authorizations.new.heading", client: "TestClient", locale: "fr")
    consent_en = I18n.t("views.oidc/authorizations.new.heading", client: "TestClient", locale: "en")
    expect(consent_fr).not_to match(/translation missing/i)
    expect(consent_en).not_to match(/translation missing/i)
    expect(consent_fr).not_to eq(consent_en)
    expect(consent_fr).to include("TestClient")
    expect(consent_en).to include("TestClient")

    error_fr = I18n.t("views.errors.base_renderer_error.heading", code: 500, locale: "fr")
    error_en = I18n.t("views.errors.base_renderer_error.heading", code: 500, locale: "en")
    expect(error_fr).not_to match(/translation missing/i)
    expect(error_en).not_to match(/translation missing/i)
    expect(error_fr).not_to eq(error_en)
    expect(error_fr).to include("500")
    expect(error_en).to include("500")
  end
end
