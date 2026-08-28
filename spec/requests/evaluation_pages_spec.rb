# frozen_string_literal: true

require "rails_helper"

# Regression coverage for feature/i18n-06-extract-evaluation: the evaluation_level_ref views had
# their hardcoded French replaced with I18n keys (plus a couple of pre-existing form bugs fixed
# in edit.html.erb along the way). Same pattern as spec/requests/users_pages_spec.rb — render
# each page in both locales, assert on real translated copy, guard against a leaked
# "translation missing" marker.
#
# Not covered here (needs a persisted `is_current` Season, and there is no Season factory yet —
# Season has presence + cross-date validations that make an inline build heavy):
#   - student_evaluations_stats#stats  (view calls @current_season.label)
#   - evaluation_appointments#incomplete  (controller calls Season.next.previous)
# Both had a single heading string extracted; wiring a Season fixture for them is left as a
# follow-up (see docs/I18n-Roadmap.md).
RSpec.describe "Evaluation pages", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "evaluation-pages-spec-admin@example.com", is_admin: true)
  end

  let!(:level) { EvaluationLevelRef.create!(label: "Intermédiaire", value: 3) }

  before { sign_in admin }

  # Headings here contain apostrophes ("Niveaux d'évaluation") and quotes
  # ('Edition du niveau "..."') that ERB's `<%=` HTML-escapes to entities in the response body,
  # so compare against the unescaped text.
  def unescaped_body
    CGI.unescapeHTML(response.body)
  end

  describe "GET /evaluation_level_ref" do
    it "renders the index in French by default" do
      get evaluation_level_ref_index_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Niveaux d'évaluation").and include("Ajouter un niveau")
    end

    it "renders the index in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get evaluation_level_ref_index_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Evaluation levels").and include("Add a level")
    end
  end

  describe "GET /evaluation_level_ref/new" do
    it "renders in French by default" do
      get new_evaluation_level_ref_path
      expect(unescaped_body).to include("Ajouter un Niveau").and include("Libellé").and include("Numéro")
    end

    it "renders in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get new_evaluation_level_ref_path
      expect(unescaped_body).to include("Add a level").and include("Label").and include("Number")
    end
  end

  describe "GET /evaluation_level_ref/:id/edit" do
    it "renders in French by default, interpolating the level label into the heading" do
      get edit_evaluation_level_ref_path(level)
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include('Edition du niveau "Intermédiaire"')
    end

    it "pre-fills the form fields from the record (regression: the model: binding was a typo)" do
      get edit_evaluation_level_ref_path(level)
      expect(response.body).to include('value="Intermédiaire"').and include('value="3"')
    end

    it "renders in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get edit_evaluation_level_ref_path(level)
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include('Editing level "Intermédiaire"')
    end
  end

  it "never leaks a raw missing-translation marker on any of these pages" do
    [
      evaluation_level_ref_index_path,
      new_evaluation_level_ref_path,
      edit_evaluation_level_ref_path(level)
    ].each do |path|
      get path
      expect(response.body).not_to include("translation missing")
    end
  end
end
