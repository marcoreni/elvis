require "rails_helper"

RSpec.describe Parameters::LocalizationParametersController, type: :controller do
  let(:admin) { FactoryBot.create(:user, is_admin: true) }

  before do
    sign_in admin
    Rails.cache.delete("parameter_app.localization.default_language")
    Rails.cache.delete("parameter_app.localization.available_languages")
  end

  describe "#update" do
    it "saves both parameters when the default is within the available languages" do
      post :update, params: { default_language: "en", available_languages: ["en", "fr"] }, format: :json

      expect(response).to have_http_status(:ok)
      expect(Parameter.find_by(label: "app.localization.default_language").value).to eq("en")
      expect(JSON.parse(Parameter.find_by(label: "app.localization.available_languages").value)).to contain_exactly("en", "fr")
    end

    it "rejects a default language that isn't in the available languages" do
      post :update, params: { default_language: "en", available_languages: ["fr"] }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(Parameter.find_by(label: "app.localization.default_language")).to be_nil
    end

    it "makes the new values visible to Parameter.get_value immediately (regression: cache used to go stale for up to 1h)" do
      post :update, params: { default_language: "en", available_languages: ["en", "fr"] }, format: :json

      expect(Parameter.get_value("app.localization.default_language")).to eq("en")
      expect(Parameter.get_value("app.localization.available_languages")).to contain_exactly("en", "fr")
    end

    it "rolls back the default_language write if the available_languages write fails (regression: the two writes used to not be transactional)" do
      Parameter.create!(label: "app.localization.default_language", value_type: "string", value: "fr")

      allow(Parameter).to receive(:find_or_create_by).and_call_original
      allow(Parameter).to receive(:find_or_create_by)
        .with(label: "app.localization.available_languages", value_type: "json")
        .and_wrap_original do |original, *args|
          record = original.call(*args)
          allow(record).to receive(:save!).and_raise(ActiveRecord::RecordInvalid.new(record))
          record
        end

      expect {
        post :update, params: { default_language: "en", available_languages: ["en"] }
      }.to raise_error(ActiveRecord::RecordInvalid)

      expect(Parameter.find_by(label: "app.localization.default_language").value).to eq("fr")
    end
  end
end
