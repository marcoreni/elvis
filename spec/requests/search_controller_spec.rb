# frozen_string_literal: true

require "rails_helper"

# Coverage for the Elasticsearch/chewy removal: POST /omnisearch used to be a Chewy multi_match
# across 5 ES indices (see docs/Modernization-Roadmap.md item 8), now Search::OmnisearchService
# (Postgres ILIKE + unaccent). No test existed for this endpoint before -- confirmed via a repo-wide
# grep as part of the removal audit. This pins the exact response shape
# frontend/components/Omnisearch.jsx depends on ({ results: [{ attributes: {...} }], total }, with
# `attributes.kind` one of "user"/"activityapplication"/"adhesion"/"activityref"/"room" and the
# per-kind field names Omnisearch.jsx's result renderers destructure).
RSpec.describe "SearchController", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "omnisearch-admin@example.com", is_admin: true) }

  before { sign_in admin }

  def search(value)
    post "/omnisearch", params: { search_value: value }, as: :json
    JSON.parse(response.body)
  end

  describe "matching a user" do
    let!(:user) do
      FactoryBot.create(:user, first_name: "École", last_name: "Piano", email: "ecole-piano@example.com")
    end

    it "matches accent-insensitively and case-insensitively" do
      body = search("ecole")

      expect(response).to have_http_status(:ok)
      match = body["results"].find { |r| r["attributes"]["kind"] == "user" && r["attributes"]["user_id"] == user.id }
      expect(match).to be_present
      expect(match["attributes"]).to include(
        "user_first_name" => "École",
        "user_last_name" => "Piano"
      )
    end

    it "matches on a substring, not just a prefix" do
      body = search("cole")

      match = body["results"].find { |r| r["attributes"]["kind"] == "user" && r["attributes"]["user_id"] == user.id }
      expect(match).to be_present
    end

    it "requires every word to match (AND across words), across different fields" do
      # "École" is in first_name, "Piano" is in last_name -- both words must be satisfied for a hit.
      body = search("ecole piano")
      match = body["results"].find { |r| r["attributes"]["kind"] == "user" && r["attributes"]["user_id"] == user.id }
      expect(match).to be_present

      body = search("ecole xyzzy")
      match = body["results"].find { |r| r["attributes"]["kind"] == "user" && r["attributes"]["user_id"] == user.id }
      expect(match).to be_nil
    end
  end

  describe "matching an activity ref" do
    let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
    let!(:activity_ref) do
      FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Guitare électrique")
    end

    it "returns it under the activityref kind with the expected fields" do
      body = search("guitare")

      match = body["results"].find { |r| r["attributes"]["kind"] == "activityref" }
      expect(match).to be_present
      expect(match["attributes"]).to eq(
        "kind" => "activityref",
        "activity_id" => activity_ref.id,
        "activity_name" => "Guitare électrique"
      )
    end
  end

  describe "matching a room" do
    let(:location) { Location.create!(label: "Bâtiment principal") }
    let!(:room) { Room.create!(label: "Studio 3", location: location, floor: 2, is_practice_room: true) }

    it "returns it under the room kind with the expected fields" do
      body = search("studio")

      match = body["results"].find { |r| r["attributes"]["kind"] == "room" }
      expect(match).to be_present
      expect(match["attributes"]).to eq(
        "kind" => "room",
        "room_id" => room.id,
        "room_name" => "Studio 3",
        "room_floor" => 2,
        "is_practice_room" => true
      )
    end
  end

  describe "matching an adhesion" do
    # adherent_number is a DB-side serial default; Rails doesn't RETURNING it back onto the
    # in-memory object after INSERT, so it reads nil until reloaded.
    let!(:adherent) { FactoryBot.create(:user, first_name: "Camille", last_name: "Adherente").reload }
    let!(:adhesion) { Adhesion.create!(user: adherent) }

    it "returns it under the adhesion kind, keyed off the member's name" do
      body = search("camille")

      match = body["results"].find { |r| r["attributes"]["kind"] == "adhesion" }
      expect(match).to be_present
      expect(match["attributes"]).to eq(
        "kind" => "adhesion",
        "adhesion_user_id" => adherent.id,
        "adhesion_adherent_number" => adherent.adherent_number,
        "adhesion_first_name" => "Camille",
        "adhesion_last_name" => "Adherente"
      )
    end
  end

  describe "matching an activity application" do
    let!(:applicant) { FactoryBot.create(:user, first_name: "Noe", last_name: "Postulant") }
    # Not ActivityApplicationStatus::TREATMENT_PENDING directly: that's a class-load-time-memoized
    # find_or_create_by! constant (app/models/activity_application_status.rb), and any earlier
    # example in this file that merely joins :activity_application_status (every search() call
    # does, via Search::OmnisearchService) is enough to first-autoload the class and commit it
    # inside THAT example's own DatabaseCleaner transaction -- which then rolls back, leaving the
    # constant holding a since-deleted id. Re-finding/creating it fresh here is immune to that.
    let!(:status) do
      ActivityApplicationStatus.find_or_create_by!(
        id: ActivityApplicationStatus::TREATMENT_PENDING_ID,
        label: "En attente de traitement", is_stopping: false, is_active: true
      )
    end
    let!(:application) do
      ActivityApplication.create!(user: applicant, activity_application_status: status)
    end

    it "returns it under the activityapplication kind with the status label" do
      body = search("postulant")

      match = body["results"].find { |r| r["attributes"]["kind"] == "activityapplication" }
      expect(match).to be_present
      expect(match["attributes"]).to eq(
        "kind" => "activityapplication",
        "application_id" => application.id,
        "application_first_name" => "Noe",
        "application_last_name" => "Postulant",
        "application_status" => "En attente de traitement"
      )
    end
  end

  describe "no match / blank query" do
    it "returns an empty result set for a query matching nothing" do
      body = search("zzznomatchzzz")
      expect(body).to eq("results" => [], "total" => 0)
    end

    it "returns an empty result set for a blank query, without erroring" do
      body = search("")
      expect(response).to have_http_status(:ok)
      expect(body).to eq("results" => [], "total" => 0)
    end
  end
end
