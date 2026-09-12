# frozen_string_literal: true

require "rails_helper"

# Regression test for a KnownIssues.md-documented bug: Parameters::PraticeParametersController's
# list_materials/list_features "active" column filter compared the raw filter value against the
# hardcoded French literal "oui" (query.where(active: filter[:value] == "oui")). Both columns are
# filtered through a plain free-text react-table box (no locale-aware dropdown), so an
# English-locale admin typing "yes" -- what the cell itself displays via shared.yes -- always got
# `active: false`. Fix accepts a small set of truthy tokens ("oui", "yes", "true", "1"),
# case-insensitively.
RSpec.describe "Practice parameters active filter", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "practice-params-active-filter-admin@example.com", is_admin: true) }

  before { sign_in admin }

  def filtered_params(value)
    {
      filtered: [{ id: "active", value: value }],
      sorted: { id: "id", desc: false },
      page: 0,
      pageSize: 10
    }
  end

  describe "POST /parameters/practice_parameters/list_materials" do
    let!(:active_material) { Material.create!(name: "Actif #{SecureRandom.hex(4)}", active: true) }
    let!(:inactive_material) { Material.create!(name: "Inactif #{SecureRandom.hex(4)}", active: false) }

    %w[oui yes true 1 OUI Yes].each do |truthy_value|
      it "matches only active materials for filter value #{truthy_value.inspect}" do
        post "/parameters/practice_parameters/list_materials", params: filtered_params(truthy_value), as: :json

        expect(response).to have_http_status(:ok)
        ids = JSON.parse(response.body)["status"].map { |m| m["id"] }
        expect(ids).to include(active_material.id)
        expect(ids).not_to include(inactive_material.id)
      end
    end

    it "matches only inactive materials for a falsy/unrecognized filter value" do
      post "/parameters/practice_parameters/list_materials", params: filtered_params("non"), as: :json

      expect(response).to have_http_status(:ok)
      ids = JSON.parse(response.body)["status"].map { |m| m["id"] }
      expect(ids).to include(inactive_material.id)
      expect(ids).not_to include(active_material.id)
    end
  end

  describe "POST /parameters/practice_parameters/list_features" do
    let!(:active_feature) { RoomFeatures.create!(name: "Actif #{SecureRandom.hex(4)}", active: true) }
    let!(:inactive_feature) { RoomFeatures.create!(name: "Inactif #{SecureRandom.hex(4)}", active: false) }

    it "matches active features for the English 'yes' filter value" do
      post "/parameters/practice_parameters/list_features", params: filtered_params("yes"), as: :json

      expect(response).to have_http_status(:ok)
      ids = JSON.parse(response.body)["status"].map { |f| f["id"] }
      expect(ids).to include(active_feature.id)
      expect(ids).not_to include(inactive_feature.id)
    end

    it "matches active features for the French 'oui' filter value" do
      post "/parameters/practice_parameters/list_features", params: filtered_params("oui"), as: :json

      expect(response).to have_http_status(:ok)
      ids = JSON.parse(response.body)["status"].map { |f| f["id"] }
      expect(ids).to include(active_feature.id)
      expect(ids).not_to include(inactive_feature.id)
    end
  end
end
