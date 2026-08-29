class LocaleController < ApplicationController
  skip_before_action :authenticate_user!

  def update
    locale = params[:locale].to_s.presence&.to_sym

    if locale && available_locales.map(&:to_sym).include?(locale)
      cookies[:locale] = locale_cookie(locale)
      current_user&.update(locale: locale.to_s)
    end

    redirect_to safe_return_to || root_path
  end

  private

  # request.referer/redirect_back's fallback is unreliable (stripped by strict Referrer-Policy,
  # ITP, or non-navigational requests), which used to strand guests without a referer on
  # root_path — sessions#new for a signed-out user, not the public page they switched language
  # from. The frontend passes the page it's actually on instead.
  #
  # Only same-origin relative paths are accepted, to keep this from becoming an open redirect.
  # A plain `start_with?("//")` check is not enough: browsers normalize a backslash to a slash,
  # so "/\evil.com" (and "/\/evil.com", "/ /evil.com", tab/newline variants) would be sent as
  # Location and then navigated to as the scheme-relative "//evil.com". Parse it and require a
  # host-less, scheme-less relative reference whose path starts with a single "/".
  def safe_return_to
    path = params[:return_to].to_s
    return if path.empty? || !path.start_with?("/") || path.start_with?("//", "/\\")

    uri = URI.parse(path)
    # relative? already implies no scheme and no host; the "//" / "/\\" cases are handled above.
    path if uri.relative? && uri.host.nil? && uri.path.start_with?("/")
  rescue URI::InvalidURIError
    nil
  end
end
