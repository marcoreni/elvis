# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the backend half of a bug surfaced in code review on PR #159:
# UserForm.jsx submits consent_docs as a hash keyed by "id_<consent_document_id>", each value
# either {agreement: true/false/"true"/"false"} (answered) or {} (left unanswered -- no
# "agreement" key at all). UsersController#update's guard (`next if doc.nil? ||
# (doc.class == Array && doc.length < 2)`) never actually fired: ActionController::Parameters#each
# is aliased to #each_pair, which always yields a 2-element [key, value] pair, so doc.length is
# always 2 regardless of whether the doc was answered. An unanswered doc therefore persisted
# has_consented: nil, which later crashed frontend/tools/obj.js's infosFromUser on page reload.
RSpec.describe UsersController, type: :controller do
  include Devise::Test::ControllerHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) { FactoryBot.create(:user, email: "consent-docs-update-admin@example.com", is_admin: true) }
  let(:student) do
    FactoryBot.create(:user, email: "consent-docs-update-student@example.com", first_name: "Camille",
                             last_name: "Martin")
  end
  let(:consent_document) { ConsentDocument.create!(title: "Règlement intérieur", expected_answer: true) }

  before { sign_in admin }

  def update_with_consent_docs(consent_docs)
    patch :update, params: {
      id: student.id,
      user: {
        first_name: student.first_name,
        last_name: student.last_name,
        levels: [],
        consent_docs: consent_docs
      }
    }, as: :json
  end

  it "does not persist has_consented: nil for a consent doc submitted with no answer" do
    update_with_consent_docs({ "id_#{consent_document.id}" => {} })

    expect(response).to have_http_status(:ok)
    expect(ConsentDocumentUser.find_by(consent_document: consent_document, user: student)).to be_nil
  end

  it "does not persist has_consented: nil when agreement is explicitly missing from the submitted doc" do
    update_with_consent_docs({ "id_#{consent_document.id}" => { "agreement" => nil } })

    expect(response).to have_http_status(:ok)
    expect(ConsentDocumentUser.find_by(consent_document: consent_document, user: student)).to be_nil
  end

  [true, false, "true", "false"].each do |agreement_value|
    it "still persists a real answer (#{agreement_value.inspect})" do
      update_with_consent_docs({ "id_#{consent_document.id}" => { "agreement" => agreement_value } })

      expect(response).to have_http_status(:ok)

      consentement = ConsentDocumentUser.find_by(consent_document: consent_document, user: student)
      expect(consentement).not_to be_nil
      expect(consentement.has_consented).to eq(ActiveModel::Type::Boolean.new.cast(agreement_value))
    end
  end

  it "updates an existing consent row to a real answer instead of leaving it nil" do
    existing = ConsentDocumentUser.create!(consent_document: consent_document, user: student, has_consented: nil)

    update_with_consent_docs({ "id_#{consent_document.id}" => { "agreement" => true } })

    expect(response).to have_http_status(:ok)
    expect(existing.reload.has_consented).to eq(true)
  end
end
