# frozen_string_literal: true

require "rails_helper"

# Companion to spec/requests/sign_in_csrf_spec.rb.
#
# `resolve_locale` may not call `current_user` (that runs Warden's strategies before the CSRF
# check — see sign_in_csrf_spec.rb), so it reads the Warden *session* user instead. That alone
# misses the visitor who comes back with a valid "remember me" cookie and no session: Devise's
# :rememberable strategy signs them in from `authenticate_user!`, which runs long after
# `switch_locale` (a prepend_around_action) resolved the locale. `persisted_user_locale`
# therefore also deserializes the remember-me cookie directly.
RSpec.describe "Locale resolution for a remembered user", type: :request do
  around do |example|
    # Season.current_apps_season memoizes in Rails.cache (a real FileStore in test) — same guard
    # as spec/requests/devise_pages_spec.rb.
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_apps_season")
  end

  let(:password) { "test1234" }
  let!(:user) do
    FactoryBot.create(:user, email: "remember-locale-spec@example.com", password: password,
                             is_admin: true, locale: "en")
  end

  # Sign in with "remember me", then throw away everything except the remember-me cookie and a
  # stale `locale` cookie that disagrees with the user's saved preference — exactly the state a
  # browser is in after a restart.
  def restart_browser_with_remember_cookie(stale_locale:)
    post "/u/sign_in", params: {
      user: { login: user.email, password: password, remember_me: "1" }
    }
    remember = cookies["remember_user_token"]
    expect(remember).to be_present, "expected sign-in to set a remember_user_token cookie"

    reset!
    cookies["remember_user_token"] = remember
    cookies["locale"] = stale_locale
  end

  # `switch_locale` rewrites the locale cookie whenever the resolved locale differs from it, so
  # the cookie after the request is a faithful read-out of what resolve_locale returned.
  it "prefers the remembered user's saved locale over a stale locale cookie" do
    restart_browser_with_remember_cookie(stale_locale: "fr")

    # NOT "/" — that route is wrapped in `authenticated :user` (config/routes.rb), whose Devise
    # route constraint already runs warden.authenticate? at routing time and would mask the bug.
    get "/users"

    expect(response).to have_http_status(:ok)
    expect(cookies["locale"]).to eq("en")
  end

  it "still falls back to the locale cookie when there is no remember-me cookie" do
    reset!
    cookies["locale"] = "en"

    get "/u/sign_in"

    expect(response).to have_http_status(:ok)
    expect(cookies["locale"]).to eq("en")
  end

  it "ignores a garbage remember-me cookie instead of blowing up" do
    reset!
    cookies["remember_user_token"] = "not-a-valid-signed-cookie"
    cookies["locale"] = "en"

    expect { get "/u/sign_in" }.not_to raise_error
    expect(response).to have_http_status(:ok)
    expect(cookies["locale"]).to eq("en")
  end
end
