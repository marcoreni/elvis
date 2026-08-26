class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  prepend_before_action :require_logo
  prepend_around_action :switch_locale
  before_action :save_request
  before_action :url_registration
  before_action :configure_permitted_parameters, if: :devise_controller?
  before_action :store_user_location!, if: :storable_location?
  before_action :authenticate_user!
  append_before_action :verify_season, only: [:index]

  attr_accessor :call_render

  before_action do
    if current_user&.creator?
      Rack::MiniProfiler.authorize_request if Object.const_defined?("Rack::MiniProfiler")
    end
  end

  # catch all error in actions
  rescue_from BaseRendererError do |exception|

    Rails.logger.error "(#{exception.code}) #{exception.sup_message || exception.message}\n#{exception.backtrace.join("\n")}"

    error_code = Rack::Utils::HTTP_STATUS_CODES.key?(exception.code) ? exception.code : :internal_server_error

    respond_to do |format|
      format.json { render json: { message: exception.message, code: exception.code }, status: error_code }
      format.html { render "errors/base_renderer_error", status: error_code, locals: { message: exception.message, code: exception.code } }
    end
  end

  def require_logo
    @school_informations = School.first
  end

  # def set_redirect_path_for_user
  #   if current_user.is_admin || current_user.is_teacher
  #     redirect_path = main.app.root_url
  #   else # user
  #     # redirect to MyActivities
  #     redirect_path = my_activities_path(current_user.id)
  #   end
  #
  #   redirect_path
  # end

  rescue_from CanCan::AccessDenied do |exception|
    respond_to do |format|
      format.json { render json: { message: "Vous n'avez pas le droit de faire cela" }, status: :forbidden }
      format.csv { head :forbidden, content_type: "text/html" }
      format.html { redirect_to main_app.root_url, notice: exception.message }
      format.js { head :forbidden, content_type: "text/html" }
    end
  end

  def render(*args)
    self.call_render = true if self.call_render.nil?

    super(*args) if self.call_render
  end

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit :sign_in, keys: %i[email password]
    devise_parameter_sanitizer.permit :sign_in, keys: %i[login password remember_me]
    devise_parameter_sanitizer.permit :account_update, keys: %i[password password_confirmation current_password]
  end

  private

  # Locale resolution cascade, see docs/I18n.md:
  #   1. the signed-in user's saved preference
  #   2. the "locale" cookie (guests, or a signed-out browser's last known language)
  #   3. the installation's configured default (Parameter "app.localization.default_language")
  #   4. I18n.default_locale as the final fallback
  # Runs as a prepended around_action so it wraps every other before_action (including
  # Devise's own, since Devise::*Controller inherits from ApplicationController by default).
  def switch_locale(&action)
    locale = resolve_locale

    cookies[:locale] = locale_cookie(locale) if cookies[:locale] != locale.to_s

    I18n.with_locale(locale, &action)
  end

  # Shared by switch_locale and LocaleController#update so the cookie options can't drift
  # out of sync between the two call sites.
  def locale_cookie(locale)
    { value: locale.to_s, expires: 1.year, same_site: :lax }
  end

  # Validates each cascade source in turn against SUPPORTED_LOCALES_SYMBOLS and falls through
  # to the next source on an invalid/blank value, instead of jumping straight to
  # I18n.default_locale the moment the first source doesn't validate.
  def resolve_locale
    installation_default = begin
      Parameter.get_value("app.localization.default_language", default: I18n.default_locale.to_s)
    rescue StandardError => e
      Rails.logger.error("[i18n] Parameter.get_value(\"app.localization.default_language\") failed: #{e.message}")
      nil
    end

    [current_user&.locale, cookies[:locale], installation_default]
      .map { |candidate| candidate.to_s.presence&.to_sym }
      .find { |locale| locale && Elvis::SUPPORTED_LOCALES_SYMBOLS.include?(locale) } ||
      I18n.default_locale
  end

  def verify_season
    if !current_user.nil? && current_user.is_admin && Season.none?
      @base_season_created = true

      [-1, 0, 1].each do |nb|
        base_season = Season.new

        current_date = DateTime.now + nb.year
        current_school_year = current_date.month < 9 ? current_date.year - 1 : current_date.year

        base_season.label = "Saison #{current_school_year}-#{current_school_year + 1}"
        base_season.start = DateTime.new current_school_year, 9, 1
        base_season.end   = DateTime.new current_school_year + 1, 6, 30
        base_season.is_current = nb == 0
        # base_season.is_next = nb == 1
        base_season.is_off = nb == -1
        base_season.opening_date_for_applications = base_season.start - 2.month
        base_season.opening_date_for_new_applications = base_season.start - 1.month
        base_season.closing_date_for_applications = base_season.start + 1.month

        base_season.save!
      end
    end
  end

  def set_current_user
    @current_user = current_user
  end

  # Its important that the location is NOT stored if:
  # - The request method is not GET (non idempotent)
  # - The request is handled by a Devise controller such as Devise::SessionsController as that could cause an
  #    infinite redirect loop.
  # - The request is an Ajax request as this can lead to very unexpected behaviour.
  def storable_location?
    request.get? && is_navigational_format? && !devise_controller? && !request.xhr?
  end

  def store_user_location!
    # :user is the scope we are authenticating
    store_location_for(:user, request.fullpath)
  end

  def save_request
    RequestStore.write(:request, request)
  end

  def url_registration
    url_string = request.base_url

    UpdateApplicationUrlUsageJob.perform_later url_string, DateTime.now.to_s
  end

end
