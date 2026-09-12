# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "AbsencesController::DAYS_FR hardcoded French
# day names, paired with a frontend sort dependency": AbsencesController#serialize_absences used to
# emit a `day` field always translated into French (DAYS_FR), which
# frontend/components/AbsencesTracking.jsx's DAYS_ORDER/dayIndex() then string-matched to sort the
# grouped-by-day UI -- so translating `day` alone (without a paired frontend change) would have
# silently broken that sort for a non-fr locale.
#
# Fix: `day` is now locale-aware (I18n.t("controllers.absences.days.*")) and a new, stable,
# locale-independent `day_index` (0-6, Date#wday order) is emitted alongside it in both the JSON
# `data` endpoint and the CSV `export`. AbsencesTracking.jsx was updated to sort on `day_index`
# instead of string-matching `day`.
RSpec.describe "AbsencesController", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) { FactoryBot.create(:user, email: "absences-admin@example.com", is_admin: true) }
  let(:teacher) do
    FactoryBot.create(
      :user, email: "absences-teacher@example.com", first_name: "Jean", last_name: "Dupont", is_teacher: true
    )
  end
  let(:student) do
    FactoryBot.create(:user, email: "absences-student@example.com", first_name: "Camille", last_name: "Martin")
  end
  let(:season) do
    Season.create!(
      label: "2025-2026",
      start: 2.years.ago, end: 1.year.from_now,
      opening_date_for_applications: 3.years.ago,
      opening_date_for_new_applications: 30.months.ago,
      closing_date_for_applications: 6.months.from_now,
      is_current: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano") }
  let(:location) { Location.create!(label: "Bâtiment principal") }
  let(:room) { Room.create!(label: "Salle 1", location: location) }
  # 2025-09-15 is a Monday -- Date#wday == 1, DAY_I18N_KEYS[1] == "monday".
  let(:time_interval) do
    TimeInterval.create!(start: DateTime.new(2025, 9, 15, 14, 0), end: DateTime.new(2025, 9, 15, 15, 0), kind: "c")
  end
  let(:activity) do
    act = Activity.create!(time_interval: time_interval, activity_ref: activity_ref, room: room, location: location)
    TeachersActivity.create!(activity: act, teacher: teacher, is_main: true)
    act
  end
  let(:activity_instance) do
    ActivityInstance.create!(time_interval: time_interval, activity: activity, room: room, location: location)
  end
  let!(:absence) do
    StudentAttendance.create!(user: student, activity_instance: activity_instance, attended: 3, remarks: "Malade")
  end

  before { sign_in admin }

  describe "GET /absences/data" do
    %w[fr en].each do |lng|
      context "in #{lng}" do
        before { cookies[:locale] = lng }

        it "returns a locale-aware day and a stable, locale-independent day_index" do
          get "/absences/data", params: { season_id: season.id }
          expect(response).to have_http_status(:ok)

          body = JSON.parse(response.body)
          entry = body["absences"].first

          expect(entry["day_index"]).to eq(1)
          expect(entry["day"]).to eq(I18n.t("controllers.absences.days.monday", locale: lng))
        end
      end
    end

    it "produces genuinely distinct fr/en day copy (catches a copy-paste locale bug)" do
      expect(I18n.t("controllers.absences.days.monday", locale: "fr"))
        .not_to eq(I18n.t("controllers.absences.days.monday", locale: "en"))
    end
  end

  describe "GET /absences/export" do
    %w[fr en].each do |lng|
      context "in #{lng}" do
        before { cookies[:locale] = lng }

        it "includes both the translated day header/value and the stable day_index column" do
          get "/absences/export", params: { season_id: season.id }
          expect(response).to have_http_status(:ok)

          rows = CSV.parse(response.body, headers: true, col_sep: ";")
          expect(rows.headers).to include(
            I18n.t("csv_exports.absences_export.day", locale: lng),
            I18n.t("csv_exports.absences_export.day_index", locale: lng)
          )

          row = rows.first
          expect(row[I18n.t("csv_exports.absences_export.day", locale: lng)])
            .to eq(I18n.t("controllers.absences.days.monday", locale: lng))
          expect(row[I18n.t("csv_exports.absences_export.day_index", locale: lng)]).to eq("1")
        end
      end
    end
  end
end
