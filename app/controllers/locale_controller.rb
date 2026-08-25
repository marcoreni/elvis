class LocaleController < ApplicationController
  skip_before_action :authenticate_user!

  def update
    locale = params[:locale].to_s

    if Elvis::SUPPORTED_LOCALES.include?(locale)
      cookies[:locale] = { value: locale, expires: 1.year, same_site: :lax }
      current_user&.update(locale: locale)
    end

    redirect_back fallback_location: root_path
  end
end
