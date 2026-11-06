# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the backend half of a bug surfaced in code review on PR #159 (see
# spec/controllers/users_controller_consent_docs_spec.rb for the UsersController#update half of
# the same bug). ActivitiesApplicationsController#create's consent_docs loop had NO guard at all
# for an unanswered doc (a submitted key like {"id_2": {}}, where doc[1][:agreement] is nil), so
# it happily persisted has_consented: nil, which later crashed frontend/tools/obj.js's
# infosFromUser on the next page load.
RSpec.describe ActivitiesApplicationsController, type: :controller do
  include Devise::Test::ControllerHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) { FactoryBot.create(:user, email: "consent-docs-create-admin@example.com", is_admin: true) }
  let(:student) do
    FactoryBot.create(:user, email: "consent-docs-create-student@example.com", first_name: "Camille",
                             last_name: "Martin")
  end
  let(:consent_document) { ConsentDocument.create!(title: "Règlement intérieur", expected_answer: true) }
  let(:season) do
    Season.create!(
      label: "2025-2026",
      start: DateTime.new(2025, 9, 1), end: DateTime.new(2026, 6, 30),
      opening_date_for_applications: DateTime.new(2025, 7, 1),
      opening_date_for_new_applications: DateTime.new(2025, 8, 1),
      closing_date_for_applications: DateTime.new(2025, 10, 1),
      is_current: true
    )
  end

  # ActivityApplicationStatus::TREATMENT_PENDING is a class-load-time-memoized find_or_create_by!
  # constant (app/models/activity_application_status.rb). Any earlier spec in the full suite that
  # references the class is enough to first-autoload it and commit the row inside THAT example's
  # own DatabaseCleaner transaction, which then rolls back, leaving the constant holding a
  # since-deleted id. #create calls ActivityApplicationStatus.find(TREATMENT_PENDING_ID) fresh, so
  # re-finding/creating it here (same defensive pattern as spec/requests/search_controller_spec.rb)
  # makes this spec immune to that ordering issue.
  let!(:treatment_pending_status) do
    ActivityApplicationStatus.find_or_create_by!(
      id: ActivityApplicationStatus::TREATMENT_PENDING_ID,
      label: "En attente de traitement", is_stopping: false, is_active: true
    )
  end

  before { sign_in admin }

  # Minimal params to reach #create's consent_docs loop (and complete the action successfully)
  # without exercising the rest of the wizard (no activities/formulas/packs selected).
  def create_with_consent_docs(consent_docs)
    post :create, params: {
      application: {
        personSelection: "myself",
        user: { id: student.id },
        infos: {
          id: student.id,
          consent_docs: consent_docs
        },
        season_id: season.id,
        intervals: [],
        selectedActivities: [],
        practicedInstruments: [],
        selectedPacks: {},
        applicationChangeAnswers: {}
      }
    }, as: :json
  end

  it "does not persist has_consented: nil for a consent doc submitted with no answer" do
    create_with_consent_docs({ "id_#{consent_document.id}" => {} })

    expect(response).to have_http_status(:ok)
    expect(ConsentDocumentUser.find_by(consent_document: consent_document, user: student)).to be_nil
  end

  it "does not persist has_consented: nil when agreement is explicitly missing from the submitted doc" do
    create_with_consent_docs({ "id_#{consent_document.id}" => { "agreement" => nil } })

    expect(response).to have_http_status(:ok)
    expect(ConsentDocumentUser.find_by(consent_document: consent_document, user: student)).to be_nil
  end

  [true, false, "true", "false"].each do |agreement_value|
    it "still persists a real answer (#{agreement_value.inspect})" do
      create_with_consent_docs({ "id_#{consent_document.id}" => { "agreement" => agreement_value } })

      expect(response).to have_http_status(:ok)

      consentement = ConsentDocumentUser.find_by(consent_document: consent_document, user: student)
      expect(consentement).not_to be_nil
      expect(consentement.has_consented).to eq(ActiveModel::Type::Boolean.new.cast(agreement_value))
    end
  end
end
