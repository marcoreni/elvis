# frozen_string_literal: true

require "rails_helper"

# Regression coverage for two bugs found manually testing the TanStack Table v8 migration of
# common/baseDataTable/BaseDataTable.jsx (docs/Modernization-Roadmap.md item 13), both pre-existing
# and unrelated to that migration:
#   - PricingCategoriesEdit.jsx's "Number of lessons" column had `id: "number_lesson"` (typo,
#     singular) while the real column is `number_lessons` -- sorting by it made #list raise on an
#     unknown column, silently swallowed frontend-side (stale data stayed on screen).
#   - #get_query_from_params only ever handled `filter[:id] == "id"`; every other filter, including
#     "name" (the one exposed in the UI), was silently dropped.
RSpec.describe "PricingCategoriesController", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "pricing-categories-admin@example.com", is_admin: true) }

  before do
    sign_in admin
    PricingCategory.create!(name: "Annuale", number_lessons: 20, is_a_pack: false)
    PricingCategory.create!(name: "Mensile", number_lessons: 40, is_a_pack: false)
  end

  def list(params)
    post "/pricing_categories/list", params: { pageSize: 20, page: 0, filtered: [] }.merge(params), as: :json
  end

  it "sorts by number_lessons" do
    list(sorted: { id: "number_lessons", desc: true })

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["data"].pluck("name")).to eq(%w[Mensile Annuale])
  end

  it "filters by a partial, case-insensitive name match" do
    list(filtered: [{ id: "name", value: "ann" }])

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["data"].pluck("name")).to eq(["Annuale"])
  end
end
