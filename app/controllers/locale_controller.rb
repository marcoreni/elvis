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
  def safe_return_to
    path = params[:return_to]

    path if path.present? && path.start_with?("/") && !path.start_with?("//")
  end
end
