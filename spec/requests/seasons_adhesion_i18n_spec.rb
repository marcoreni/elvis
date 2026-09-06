# frozen_string_literal: true

require "rails_helper"

# Area smoke for feat/i18n-p3-enrolment-money (I18n Roadmap Phase 07 P3): the seasons/* and
# adhesion/* ERB chrome + season form labels were extracted to I18n keys
# (views.seasons.* / views.adhesion.* page chrome, activerecord.attributes.season.* form labels
# via bare `f.label :attr`, plus views.shared.form_errors.heading in two payment _form partials).
#
# This is the P3 *area* smoke, NOT per-string coverage: it renders the representative
# seasons/adhesion pages in both locales and checks 200, no leaked "translation missing" marker,
# and that the page heading resolves to the locale-specific copy. Mirrors
# spec/requests/practice_scaffold_i18n_spec.rb and navigation_menu_i18n_spec.rb.
RSpec.describe "Seasons / adhesion i18n", type: :request do
  include Devise::Test::IntegrationHelpers

  # Season.current / Season.current_apps_season (app/models/season.rb) cache in Rails.cache, a real
  # FileStore in the test env not cleared by transaction rollback -- same guard as the other
  # spec/requests/*_i18n_spec.rb files.
  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "seasons-adhesion-i18n-admin@example.com", is_admin: true)
  end

  before { sign_in admin }

  # path => I18n key of the heading rendered on that page
  pages = {
    "/seasons" => "views.seasons.index.heading",
    "/seasons/new" => "views.seasons.new.heading",
    "/adhesions" => "views.adhesion.index.heading"
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
end
