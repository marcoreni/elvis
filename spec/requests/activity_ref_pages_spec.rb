# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the i18n extraction on the "activities" domain lot 1: the
# activity_ref_kind admin CRUD views (index / new / _form) and activity_ref#index had their
# hardcoded French headings/labels replaced with I18n keys
# (views.activity_ref_kind.*, views.activity_ref.index.*, common.actions.save). Same pattern as
# spec/requests/payment_admin_pages_spec.rb / formules_pages_spec.rb — render in both locales,
# assert on real translated copy (unescaped, since the headings carry apostrophes), guard against
# a leaked "translation missing" marker.
#
# The activities/ActivityRefKind + activities/Instruments React tables are covered by the
# colocated Vitest spec (frontend/components/activities/ActivityRefKind.test.jsx); server-side
# those views are just a `react_component` mount div.
#
# activity_ref#new and #edit are intentionally NOT exercised here: their views call
# `Season.current.id`, and there is no Season factory — building a valid Season inline means five
# ordered date columns plus the check_start_end / check_applications_dates validations, i.e. more
# than the "couple of create! lines" bar. Same Season-factory blocker other request specs hit;
# deferred until a shared Season factory exists.
RSpec.describe "Activity ref pages", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "activity-ref-spec@example.com", is_admin: true)
  end

  before { sign_in admin }

  def unescaped_body
    CGI.unescapeHTML(response.body)
  end

  describe "GET /activity_ref_kind (index)" do
    it "renders the heading in French by default" do
      get activity_ref_kind_index_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Familles d'activités")
    end

    it "renders the heading in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get activity_ref_kind_index_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Activity families")
    end
  end

  describe "GET /activity_ref_kind/new" do
    it "renders the heading, the name label and the save button in French by default" do
      get new_activity_ref_kind_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body)
        .to include("Ajouter une famille d'activité")
        .and include("Nom")
        .and include("Sauvegarder")
    end

    it "renders the heading, the name label and the save button in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get new_activity_ref_kind_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body)
        .to include("Add an activity family")
        .and include("Name")
        .and include("Save")
    end
  end

  describe "GET /activity_ref (index)" do
    it "renders the heading and the add/export actions in French by default" do
      get activity_ref_index_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body)
        .to include("Référentiel des activités")
        .and include("Ajouter une activité")
        .and include("Exporter")
    end

    it "renders the heading and the add/export actions in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get activity_ref_index_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body)
        .to include("Activities reference list")
        .and include("Add an activity")
        .and include("Export")
    end

    context "with persisted activities in the catalog" do
      let!(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
      # One activity per duration branch of app/views/activity_ref/index.html.erb:
      # duration: 90 -> hours > 0 -> views.activity_ref.index.duration_hours (two %{} placeholders)
      # duration: 45 -> hours == 0 -> views.activity_ref.index.duration_minutes
      let!(:activity_hours) do
        FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Atelier long", duration: 90)
      end
      let!(:activity_minutes) do
        FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Atelier court", duration: 45)
      end

      it "renders the heading, the places copy and both duration branches in French by default" do
        get activity_ref_index_path
        expect(response).to have_http_status(:ok)
        expect(unescaped_body)
          .to include("Référentiel des activités")
          # occupation_limit { 5 } / occupation_hard_limit { 10 } from spec/factories/activity_refs.rb
          .and include("Places possibles: 5 (max: 10)")
          .and include("Durée: 1h30")
          .and include("Durée: 45 minutes")
      end

      it "renders the heading, the places copy and both duration branches in English when the locale cookie is set" do
        cookies[:locale] = "en"
        get activity_ref_index_path
        expect(response).to have_http_status(:ok)
        expect(unescaped_body)
          .to include("Activities reference list")
          .and include("Possible spots: 5 (max: 10)")
          .and include("Duration: 1h30")
          .and include("Duration: 45 minutes")
      end
    end
  end

  it "never leaks a raw missing-translation marker on any of these pages" do
    [activity_ref_kind_index_path, new_activity_ref_kind_path, activity_ref_index_path].each do |path|
      get path
      expect(response.body).not_to include("translation missing")

      cookies[:locale] = "en"
      get path
      expect(response.body).not_to include("translation missing")
      cookies.delete(:locale)
    end
  end
end
