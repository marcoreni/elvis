# frozen_string_literal: true

require "rails_helper"

# Area smoke for feat/i18n-p4-activity-catalogue-member-erb (I18n Roadmap Phase 07 P4): the
# activity_application_statuses/* ERB chrome was extracted to I18n keys
# (views.activity_application_statuses.* page chrome + table headers,
# activerecord.attributes.activity_application_status.* form labels via bare `f.label :attr`,
# common.labels.{yes,no,active,actions} / common.actions.save reuse).
#
# This is the P4 *area* smoke, NOT per-string coverage: it renders the representative
# activity_application_statuses pages in both locales and checks 200, no leaked
# "translation missing" marker, and that the page heading resolves to the locale-specific copy.
# Mirrors spec/requests/seasons_adhesion_i18n_spec.rb and practice_scaffold_i18n_spec.rb.
#
# teachers/index (one heading) and students/index (a wicked_pdf PDF view) also got keys in P4
# but are deliberately not exercised here -- PDF rendering in a request spec is fiddly and
# low-value for a checkpoint test.
RSpec.describe "Activity application statuses i18n", type: :request do
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
    FactoryBot.create(:user, email: "activity-application-statuses-i18n-admin@example.com", is_admin: true)
  end

  before { sign_in admin }

  # path => I18n key of the heading rendered on that page
  pages = {
    "/activity_application_statuses" => "views.activity_application_statuses.index.heading",
    "/activity_application_statuses/new" => "views.activity_application_statuses.new.title"
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

  # The form labels its fields with bare `f.label :attr`, resolved via
  # ActivityApplicationStatus.human_attribute_name -> activerecord.attributes.activity_application_status.*.
  # A missing key there does NOT raise "translation missing"; Rails silently humanizes the
  # attribute name instead. So the marker assertion above cannot catch a dropped
  # activity_application_status.* key -- assert the configured labels render verbatim.
  it "renders the configured activerecord.attributes.activity_application_status.* form labels on /new" do
    cookies[:locale] = "fr"
    get "/activity_application_statuses/new"
    expect(response).to have_http_status(:ok)

    body = CGI.unescapeHTML(response.body)
    expect(body).to include(I18n.t("activerecord.attributes.activity_application_status.label", locale: "fr"))
    expect(body).to include(I18n.t("activerecord.attributes.activity_application_status.is_stopping", locale: "fr"))
    expect(body).to include(I18n.t("activerecord.attributes.activity_application_status.is_active", locale: "fr"))
  end
end
