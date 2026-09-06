# frozen_string_literal: true

require "rails_helper"

# Area smoke for feat/i18n-p1-menu-and-chrome (I18n Roadmap Phase 07 P1): the navigation menu
# and app-chrome layouts were extracted to I18n keys.
#
#   - config/initializers/20-menu_generator.rb: every menu item `caption:` is now a
#     `:"menu.<key>"` Symbol.
#   - lib/elvis/menu_manager.rb#caption: a Symbol caption is resolved with `I18n.t(@caption)` at
#     render time, so it must follow the request locale even though the menu tree is built once
#     at boot.
#   - config/locales/{fr,en}.yml: new `menu:` block + `views.layouts.application.*` chrome keys.
#
# GET /users renders layouts/application (the admin side menu via partials/_render_menu.erb), so
# it exercises both the Symbol-caption resolution and the chrome strings in one request. This is
# the P1 smoke — it deliberately does not assert on every one of the 37 menu keys.
RSpec.describe "Navigation menu & app chrome i18n", type: :request do
  include Devise::Test::IntegrationHelpers

  # Season.current / Season.current_apps_season (app/models/season.rb) cache in Rails.cache, a
  # real FileStore in the test env that DatabaseCleaner's rollback does not touch — same guard as
  # spec/requests/users_pages_spec.rb / devise_pages_spec.rb.
  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "nav-menu-i18n-spec-admin@example.com", is_admin: true)
  end

  %w[fr en].each do |lng|
    context "with the locale cookie set to #{lng}" do
      # t() returns a plain (escaped-on-output) String, and the menu caption is emitted through
      # link_to's escaping, so apostrophes in the FR copy render as entities — compare against the
      # unescaped body, the way spec/requests/devise_pages_spec.rb does.
      let(:body) { CGI.unescapeHTML(response.body) }

      before do
        cookies[:locale] = lng
        sign_in admin
        get "/users"
      end

      it "renders the page" do
        expect(response).to have_http_status(:ok)
      end

      it "leaks no raw missing-translation marker" do
        # Case-insensitive: the view helper `t` emits a lowercase "translation missing:" title,
        # but the menu path uses raw `I18n.t` whose marker is "Translation missing: ...".
        expect(body).not_to match(/translation missing/i)
      end

      it "resolves the Symbol menu captions to the #{lng} copy" do
        # Resolved at run time so a still-in-flight EN wording change does not break the spec.
        expect(body).to include(I18n.t("menu.users", locale: lng))
        expect(body).to include(I18n.t("menu.adhesions", locale: lng))
      end

      it "renders a views.layouts.application.* chrome string in #{lng}" do
        expect(body).to include(I18n.t("views.layouts.application.help_center", locale: lng))
      end
    end
  end

  it "has genuinely distinct fr/en copy for the sampled menu + chrome keys" do
    # Guards against a copy-paste locale bug (EN block left holding FR values or vice versa).
    %w[menu.users menu.adhesions views.layouts.application.help_center].each do |key|
      expect(I18n.t(key, locale: "fr")).not_to eq(I18n.t(key, locale: "en"))
    end
  end
end
