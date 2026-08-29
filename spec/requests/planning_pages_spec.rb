# frozen_string_literal: true

require "rails_helper"

# Regression coverage for feature/i18n-06-extract-planning lot 1 (ERB views): the
# app/views/planning/*.erb headings, alert copy, lock/unlock buttons and ConfirmLink
# label/message props had their hardcoded French replaced with I18n keys under
# views.planning.*. Same pattern as spec/requests/payment_admin_pages_spec.rb — render in both
# locales, assert on real translated copy (unescaped, several strings carry apostrophes / "!"),
# guard against a leaked "translation missing" marker.
#
# Only the two lightweight index actions are exercised here. The show / show_generic /
# show_availabilities* / show_for_conflict / show_for_room views need a persisted current
# Season plus heavy per-action fixtures (PlanningSerializer, rooms-for-user-activities,
# teachers list, the new-student questionnaire); wiring a Season factory is the blocking
# prerequisite — same TODO the i18n-06 evaluation branch logged. Their keys are still verified
# by `bin/i18n-tasks health` (0 missing / 0 unused) and by direct key-reference audit.
RSpec.describe "Planning pages", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) { FactoryBot.create(:user, email: "planning-spec-admin@example.com", is_admin: true) }
  let!(:location) { Location.create!(label: "Site principal") }

  before { sign_in admin }

  def unescaped_body
    CGI.unescapeHTML(response.body)
  end

  describe "GET /plannings/rooms (index_for_rooms)" do
    it "renders the heading and empty state in French by default" do
      get "/plannings/rooms"
      expect(response).to have_http_status(:ok)
      expect(unescaped_body)
        .to include("Plannings des Salles de Cours")
        .and include("Creer une nouvelle salle")
        .and include("Aucune salle de cours n'est enregistrée.")
    end

    it "renders in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get "/plannings/rooms"
      expect(response).to have_http_status(:ok)
      expect(unescaped_body)
        .to include("Classroom plannings")
        .and include("Create a new classroom")
        .and include("No classroom is registered.")
    end

    it "renders the room list without the empty state when a room exists" do
      Room.create!(label: "Salle A", location: location)

      get "/plannings/rooms"
      expect(unescaped_body).to include("Plannings des Salles de Cours")
      expect(unescaped_body).not_to include("Aucune salle de cours n'est enregistrée.")
    end
  end

  describe "GET /plannings/teachers (index_for_teachers)" do
    it "renders the heading in both locales" do
      get "/plannings/teachers"
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Plannings des professeurs")

      cookies[:locale] = "en"
      get "/plannings/teachers"
      expect(unescaped_body).to include("Teacher plannings")
    end
  end

  it "never leaks a raw missing-translation marker on these pages" do
    ["/plannings/rooms", "/plannings/teachers"].each do |path|
      get path
      expect(response.body).not_to include("translation missing")
    end
  end
end
