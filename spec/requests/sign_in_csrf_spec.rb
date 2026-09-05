# frozen_string_literal: true

require "rails_helper"

# Regression coverage for fix/switch-locale-csrf.
#
# ApplicationController runs `prepend_around_action :switch_locale`, so `switch_locale` ->
# `resolve_locale` executes *before* `verify_authenticity_token`. Before the fix, `resolve_locale`
# started its cascade with `current_user&.locale`; on a sign-in POST that made Warden run its
# authentication strategies against the submitted credentials, and a *successful* auth fired
# Devise's `clean_up_csrf_token_on_authentication` hook, deleting `session[:_csrf_token]` before
# the CSRF check read it. `verify_authenticity_token` then regenerated the token, the submitted
# one no longer matched, and every valid login raised `ActionController::InvalidAuthenticityToken`
# (HTTP 422). Wrong-password logins were unaffected (Warden fails -> hook never fires).
#
# The fix replaces `current_user&.locale` with `persisted_user_locale`, which reads
# `request.env["warden"].user(scope: :user)` — deserialization only (`event: :fetch`, ignored by
# the Devise hook), no strategies, nil on the sign-in request itself.
#
# `config/environments/test.rb` disables forgery protection, so this spec re-enables it for the
# duration of each example and drives a real, scraped authenticity token.
RSpec.describe "Sign-in CSRF (switch_locale must not pre-authenticate)", type: :request do
  around do |example|
    # Season.current_apps_season memoizes in Rails.cache (a real FileStore in test) — same guard
    # as spec/requests/devise_pages_spec.rb.
    Rails.cache.delete("current_apps_season")

    previous = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    begin
      example.run
    ensure
      ActionController::Base.allow_forgery_protection = previous
      Rails.cache.delete("current_apps_season")
    end
  end

  let(:password) { "test1234" }

  let!(:user) do
    FactoryBot.create(:user, email: "csrf-login-spec@example.com", password: password, is_admin: true)
  end

  # The layout renders the language-switcher `button_to` forms (one per available locale) *before*
  # the sign-in form, each with its own hidden `authenticity_token`. Scrape the token from inside
  # `<form id="new_user">` specifically, not the first token on the page.
  def sign_in_form_token
    get "/u/sign_in"
    expect(response).to have_http_status(:ok)

    form = Nokogiri::HTML(response.body).at_css("form#new_user")
    expect(form).to be_present, "expected the Devise sign-in form (#new_user) on /u/sign_in"

    token = form.at_css('input[name="authenticity_token"]')&.[]("value")
    expect(token).to be_present, "expected a hidden authenticity_token inside the sign-in form"
    token
  end

  it "guards the other examples: forgery protection is genuinely active here" do
    expect(ActionController::Base.allow_forgery_protection).to be(true)

    get "/u/sign_in"

    expect do
      post "/u/sign_in", params: {
        authenticity_token: "not-a-real-token",
        user: { login: user.email, password: password, remember_me: "0" }
      }
    end.to raise_error(ActionController::InvalidAuthenticityToken)
  end

  it "lets a valid-credential login through instead of 422-ing on a stale CSRF token" do
    token = sign_in_form_token

    expect do
      post "/u/sign_in", params: {
        authenticity_token: token,
        user: { login: user.email, password: password, remember_me: "0" }
      }
    end.not_to raise_error

    expect(response).to have_http_status(:found)
    expect(response).not_to redirect_to("/u/sign_in")

    # And the user really is signed in: Devise's require_no_authentication now bounces an
    # authenticated visitor off the sign-in page instead of serving the form.
    get "/u/sign_in"
    expect(response).to have_http_status(:found)
    expect(response).not_to redirect_to("/u/sign_in")
  end

  it "still rejects a wrong-password login as a form error, not a CSRF failure" do
    token = sign_in_form_token

    expect do
      post "/u/sign_in", params: {
        authenticity_token: token,
        user: { login: user.email, password: "wrong-#{password}", remember_me: "0" }
      }
    end.not_to raise_error

    expect(response).not_to have_http_status(:unprocessable_entity)

    follow_redirect! while response.status == 302
    expect(response).to have_http_status(:ok)
    # Back on the sign-in form, still not authenticated.
    expect(Nokogiri::HTML(response.body).at_css("form#new_user")).to be_present
  end
end
