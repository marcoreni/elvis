class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  prepend_before_action :require_logo
  prepend_around_action :switch_locale
  helper_method :available_locales
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

  # Validates each cascade source in turn against the installation's available_locales and falls
  # through to the next source on an invalid/blank value, instead of jumping straight to
  # I18n.default_locale the moment the first source doesn't validate. I18n.default_locale itself
  # is included as a candidate (not an unconditional final fallback) since an installation can
  # disable it via available_locales; if truly nothing validates, prefer any enabled locale over
  # one the admin explicitly disabled, and only fall back to the raw default as an absolute last
  # resort (e.g. available_locales itself came back empty).
  def resolve_locale
    available = available_locales.map(&:to_sym)

    [persisted_user_locale, cookies[:locale], localization_settings[:default_language], I18n.default_locale]
      .map { |candidate| candidate.to_s.presence&.to_sym }
      .find { |locale| locale && available.include?(locale) } ||
      available.first ||
      I18n.default_locale
  end

  # The already-signed-in user's saved locale, read from the Warden session (or, failing that, the
  # remember-me cookie) WITHOUT running authentication strategies. switch_locale is a
  # prepend_around_action, so it runs before verify_authenticity_token; calling `current_user`
  # here would make Warden authenticate the submitted credentials on a sign-in POST, and a
  # *successful* auth fires Devise's clean_up_csrf_token_on_authentication hook (registered
  # `after_authentication`, i.e. only for `event: :authentication`), which deletes
  # session[:_csrf_token] before the CSRF check reads it -> every valid login 422s with
  # InvalidAuthenticityToken. `warden.user` only deserializes an already-persisted user
  # (`event: :fetch`, which that hook does not run for) and returns nil on the sign-in request
  # itself, where the user isn't signed in yet anyway.
  def persisted_user_locale
    (request.env["warden"]&.user(scope: :user) || remembered_user)&.locale
  rescue StandardError => e
    Rails.logger.debug("[i18n] persisted_user_locale lookup failed: #{e.message}")
    nil
  end

  # `warden.user` above only sees a user already in the *session*. A visitor coming back with a
  # valid "remember me" cookie but no session (a browser restart drops the session cookie) is
  # only signed in later, by Devise's :rememberable strategy inside authenticate_user! — long
  # after switch_locale resolved the locale — so without this their saved preference would be
  # skipped and the first page after every restart would render from the stale locale cookie.
  #
  # We can't reach that user via warden.authenticate here (that is the whole point of
  # persisted_user_locale), so deserialize the signed cookie directly: the same two calls
  # Devise::Strategies::Rememberable#authenticate! makes, minus the Warden authentication event.
  # Nothing is written, no hook fires, and the strategy still does the real sign-in afterwards.
  def remembered_user
    cookie = cookies.signed[User.rememberable_options.fetch(:key, "remember_user_token")]
    return nil if cookie.blank?

    User.serialize_from_cookie(*cookie)
  end

  # Locales this installation actually exposes to its users — the subset of the code-shipped
  # Elvis::SUPPORTED_LOCALES the admin enabled via the "Langues" settings screen (Parameter
  # "app.localization.available_languages", see Parameters::LocalizationParametersController).
  # localization_settings already handles a failed/absent lookup (returns the SUPPORTED_LOCALES
  # default). Here we only guard the *shape* of the stored value: a proper list is intersected
  # with SUPPORTED_LOCALES as-is (an explicit empty list means "disable everything", and
  # resolve_locale then falls to I18n.default_locale); anything that isn't a list (a legacy row,
  # a non-json write) is treated as misconfiguration and we expose all supported locales rather
  # than let `SUPPORTED_LOCALES & scalar` raise on every request. Drives locale clamping above
  # and the language switcher UI.
  def available_locales
    @available_locales ||= begin
      configured = localization_settings[:available_languages]
      configured.is_a?(Array) ? Elvis::SUPPORTED_LOCALES & configured : Elvis::SUPPORTED_LOCALES
    end
  end

  # Both localization Parameters in a single cache round-trip (read_multi via Parameter.get_values),
  # memoized per request. switch_locale is a prepend_around_action that runs on *every* request
  # (JSON/API included), so reading these two rarely-changing values as two separate cache GETs
  # was two Redis round-trips per request in production; this collapses them to one. On any
  # failure, fall back to the code-shipped defaults (same values the two reads fell back to
  # individually before).
  def localization_settings
    @localization_settings ||= begin
      values = Parameter.get_values(
        "app.localization.default_language",
        "app.localization.available_languages",
        defaults: {
          "app.localization.default_language" => I18n.default_locale.to_s,
          "app.localization.available_languages" => Elvis::SUPPORTED_LOCALES
        }
      )

      {
        default_language: values["app.localization.default_language"],
        available_languages: values["app.localization.available_languages"]
      }
    rescue StandardError => e
      Rails.logger.error("[i18n] localization settings lookup failed: #{e.message}")
      { default_language: I18n.default_locale.to_s, available_languages: Elvis::SUPPORTED_LOCALES }
    end
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
