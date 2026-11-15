# frozen_string_literal: true

require "rails_helper"

# Coverage for PATCH /season/:id/holidays (SeasonsController#update_holidays).
#
# A "holiday" as shown in the /seasons/:id/edit UI is not a single record: it is N individual
# Holiday rows (one per calendar date), identified client-side by the aggregate (label, start,
# end). This endpoint locates that group of rows via the (label, start, end) triple, deletes it,
# and recreates one Holiday row per date of the new (new_label, new_start, new_end) range -- all
# inside one transaction.
RSpec.describe "PATCH /season/:id/holidays", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) { FactoryBot.create(:user, email: "season-update-holidays-admin@example.com", is_admin: true) }

  def build_season(label: "2025-2026")
    Season.create!(
      label: label,
      start: 2.years.ago, end: 1.year.from_now,
      opening_date_for_applications: 3.years.ago,
      opening_date_for_new_applications: 30.months.ago,
      closing_date_for_applications: 6.months.from_now,
      is_current: false
    )
  end

  let(:season) { build_season }

  before { sign_in admin }

  def create_holiday_range(season, label:, start:, finish:)
    (start..finish).each { |date| season.holidays.create!(date: date, label: label, kind: "school") }
  end

  describe "success" do
    it "deletes the old range and creates the new one, renaming the group" do
      create_holiday_range(season, label: "Toussaint", start: Date.new(2025, 10, 20), finish: Date.new(2025, 10, 24))

      patch "/season/#{season.id}/holidays", params: {
        label: "Toussaint", start: "2025-10-20", end: "2025-10-24",
        new_label: "Vacances de la Toussaint", new_start: "2025-10-21", new_end: "2025-10-23"
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq(
        "label" => "Vacances de la Toussaint", "start" => "2025-10-21", "end" => "2025-10-23"
      )

      expect(season.holidays.where(label: "Toussaint")).to be_empty

      new_rows = season.holidays.where(label: "Vacances de la Toussaint").order(:date)
      expect(new_rows.pluck(:date)).to eq([Date.new(2025, 10, 21), Date.new(2025, 10, 22), Date.new(2025, 10, 23)])
      expect(new_rows.pluck(:kind).uniq).to eq(["school"])
    end

    it "scopes the match to the season from :id, not globally by label" do
      other_season = build_season(label: "2026-2027")
      create_holiday_range(season, label: "Noel", start: Date.new(2025, 12, 20), finish: Date.new(2025, 12, 31))
      create_holiday_range(other_season, label: "Noel", start: Date.new(2025, 12, 20), finish: Date.new(2025, 12, 31))

      patch "/season/#{season.id}/holidays", params: {
        label: "Noel", start: "2025-12-20", end: "2025-12-31",
        new_label: "Noel renomme", new_start: "2025-12-20", new_end: "2025-12-31"
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(season.holidays.where(label: "Noel")).to be_empty
      expect(other_season.holidays.where(label: "Noel").count).to eq(12)
      expect(other_season.holidays.where(label: "Noel renomme")).to be_empty
    end
  end

  describe "failure (422)" do
    before do
      create_holiday_range(season, label: "Toussaint", start: Date.new(2025, 10, 20), finish: Date.new(2025, 10, 24))
    end

    def base_params
      {
        label: "Toussaint", start: "2025-10-20", end: "2025-10-24",
        new_label: "Vacances de la Toussaint", new_start: "2025-10-21", new_end: "2025-10-23"
      }
    end

    %i[label start end new_label new_start new_end].each do |blank_key|
      it "422s when #{blank_key} is blank" do
        patch "/season/#{season.id}/holidays", params: base_params.merge(blank_key => ""), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)["errors"]).to be_present
        expect(season.holidays.where(label: "Toussaint").count).to eq(5)
      end
    end

    %i[start end new_start new_end].each do |date_key|
      it "422s when #{date_key} is not a parseable date" do
        patch "/season/#{season.id}/holidays", params: base_params.merge(date_key => "not-a-date"), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)["errors"]).to be_present
        expect(season.holidays.where(label: "Toussaint").count).to eq(5)
      end
    end

    it "422s when new_start is after new_end" do
      patch "/season/#{season.id}/holidays",
            params: base_params.merge(new_start: "2025-10-23", new_end: "2025-10-21"), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
      expect(season.holidays.where(label: "Toussaint").count).to eq(5)
    end

    it "422s when no Holiday rows match the identifying (label, start, end) triple" do
      patch "/season/#{season.id}/holidays", params: base_params.merge(label: "Pas la bonne etiquette"), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present
      expect(season.holidays.where(label: "Toussaint").count).to eq(5)
    end
  end

  describe "transactional rollback" do
    it "leaves the original rows intact when a create fails part-way through the new range" do
      create_holiday_range(season, label: "Noel", start: Date.new(2025, 12, 20), finish: Date.new(2025, 12, 22))

      call_count = 0
      allow_any_instance_of(Holiday).to receive(:save!) do |instance|
        call_count += 1
        raise ActiveRecord::RecordNotSaved.new("forced failure", instance) if call_count == 2

        instance.save
      end

      patch "/season/#{season.id}/holidays", params: {
        label: "Noel", start: "2025-12-20", end: "2025-12-22",
        new_label: "Noel renomme", new_start: "2026-01-02", new_end: "2026-01-04"
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["errors"]).to be_present

      # the original rows survived the attempted delete (rolled back)...
      original_rows = season.holidays.where(label: "Noel").order(:date)
      expect(original_rows.pluck(:date)).to eq([Date.new(2025, 12, 20), Date.new(2025, 12, 21), Date.new(2025, 12, 22)])

      # ...and the one new row that *did* save before the failure was rolled back too
      expect(season.holidays.where(label: "Noel renomme")).to be_empty
    end
  end
end
