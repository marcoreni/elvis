require "rails_helper"

RSpec.describe LocaleController, type: :controller do
  describe "#update" do
    context "with a supported locale" do
      it "sets the locale cookie" do
        patch :update, params: { locale: "en" }

        expect(response.cookies["locale"]).to eq("en")
      end

      it "persists the locale on the signed-in user" do
        user = FactoryBot.create(:user, locale: "fr")
        sign_in user

        patch :update, params: { locale: "en" }

        expect(user.reload.locale).to eq("en")
      end
    end

    context "with an unsupported locale" do
      it "does not set the locale cookie to the unsupported value" do
        # switch_locale (ApplicationController's prepend_around_action) still runs on this
        # request and sets its own resolved-default cookie — LocaleController#update just
        # doesn't overwrite it with the invalid "xx" value.
        patch :update, params: { locale: "xx" }

        expect(response.cookies["locale"]).to eq(I18n.default_locale.to_s)
      end

      it "does not update the signed-in user's locale" do
        user = FactoryBot.create(:user, locale: "fr")
        sign_in user

        patch :update, params: { locale: "xx" }

        expect(user.reload.locale).to eq("fr")
      end
    end

    describe "return_to redirect" do
      it "redirects to a safe relative return_to path when present" do
        patch :update, params: { locale: "en", return_to: "/students" }

        expect(response).to redirect_to("/students")
      end

      it "falls back to root_path when return_to is absent" do
        patch :update, params: { locale: "en" }

        expect(response).to redirect_to(root_path)
      end

      it "ignores a protocol-relative return_to (open-redirect guard)" do
        patch :update, params: { locale: "en", return_to: "//evil.example.com" }

        expect(response).to redirect_to(root_path)
      end

      it "ignores a return_to that isn't a relative path" do
        patch :update, params: { locale: "en", return_to: "https://evil.example.com" }

        expect(response).to redirect_to(root_path)
      end

      # Browsers normalize a backslash to a forward slash, so "/\evil.com" is delivered as the
      # scheme-relative "//evil.com" — the guard must reject it (and its variants) too.
      [
        "/\\evil.example.com",
        "/\\/evil.example.com",
        "/\t/evil.example.com",
        "/ /evil.example.com",
        "/\n//evil.example.com",
        # a CR/LF anywhere would otherwise survive into redirect_to and 500 on Rack's header check
        "/dashboard\r\nX-Injected: 1",
        "/ok\npath"
      ].each do |hostile|
        it "ignores the payload #{hostile.inspect} and stays on root_path" do
          patch :update, params: { locale: "en", return_to: hostile }

          expect(response).to redirect_to(root_path)
        end
      end

      it "keeps the query string and fragment of a safe relative path" do
        patch :update, params: { locale: "en", return_to: "/students?page=2#list" }

        expect(response).to redirect_to("/students?page=2#list")
      end

      # The guard must not reject legitimate same-origin paths a strict URI parser would choke on
      # — accented segments (this is a French app) and query strings with unencoded characters.
      [
        "/activités",
        "/recherche?q=été|automne",
        "/étudiants?nom=François^"
      ].each do |safe|
        it "still honours the same-origin path #{safe.inspect}" do
          patch :update, params: { locale: "en", return_to: safe }

          expect(response).to redirect_to(safe)
        end
      end
    end
  end
end
