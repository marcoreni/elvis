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
  # A plain `start_with?("//")` check is not enough:
  #   - a leading "/" followed by "/", "\" (browser-normalized to "/"), or a space resolves to a
  #     scheme-relative "//host" URL;
  #   - a raw control char (CR/LF especially) survives into redirect_to and trips Rack's header
  #     validation -> 500.
  # Reject both; everything else starting with "/" is a same-origin path — including accented
  # ones like "/activités" and query strings with unencoded characters, which a URI parse would
  # wrongly reject.
  def safe_return_to
    path = params[:return_to].to_s
    return unless path.start_with?("/")
    return if path.match?(/[[:cntrl:]]/)
    return if path[1..]&.match?(%r{\A[/\\ ]})

    path
  end
end
