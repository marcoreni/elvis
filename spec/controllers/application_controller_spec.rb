require "rails_helper"

RSpec.describe ApplicationController, type: :controller do
  controller do
    skip_before_action :authenticate_user!

    def index
      render plain: I18n.locale.to_s
    end
  end

  before { routes.draw { get "index" => "anonymous#index" } }

  describe "locale resolution cascade (#resolve_locale)" do
    it "prefers the signed-in user's locale over the cookie" do
      user = FactoryBot.create(:user, locale: "en")
      sign_in user
      request.cookies[:locale] = "fr"

      get :index

      expect(response.body).to eq("en")
    end

    it "falls back to the cookie when there is no signed-in user" do
      request.cookies[:locale] = "en"

      get :index

      expect(response.body).to eq("en")
    end

    it "skips an invalid cookie and falls through to the installation default" do
      request.cookies[:locale] = "xx"

      get :index

      expect(response.body).to eq(I18n.default_locale.to_s)
    end

    it "falls back to I18n.default_locale when Parameter.get_value raises" do
      allow(Parameter).to receive(:get_value).and_raise(StandardError, "boom")

      get :index

      expect(response.body).to eq(I18n.default_locale.to_s)
    end

    it "falls back to an actually-available locale, not the raw I18n.default_locale, when the admin disabled it (regression: PR #5 finding #3)" do
      Parameter.create!(label: "app.localization.available_languages", value_type: "json", value: ["en"].to_json)
      allow(Parameter).to receive(:get_value).and_call_original
      allow(Parameter).to receive(:get_value)
        .with("app.localization.default_language", default: anything)
        .and_raise(StandardError, "boom")

      get :index

      expect(I18n.default_locale.to_s).to eq("fr") # sanity: this scenario requires fr to be the raw default
      expect(response.body).to eq("en")
    end
  end

  describe "callback ordering" do
    it "wraps require_logo inside switch_locale, per the documented guarantee" do
      # CallbackChain#index has a Rails-specific signature (looks up a callback by filter name)
      # incompatible with Enumerable's block-based #index, so materialize a plain array first.
      filters = ApplicationController._process_action_callbacks.to_a.map(&:filter)

      expect(filters.index(:switch_locale)).to be < filters.index(:require_logo)
    end
  end
end
