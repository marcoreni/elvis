class Parameters::LocalizationParametersController < ApplicationController
  def index
  end

  def show
    authorize! :manage, Parameter

    render json: {
      defaultLanguage: Parameter.get_value("app.localization.default_language", default: I18n.default_locale.to_s),
      availableLanguages: Parameter.get_value("app.localization.available_languages", default: Elvis::SUPPORTED_LOCALES),
      supportedLocales: Elvis::SUPPORTED_LOCALES
    }
  end

  def update
    authorize! :manage, Parameter

    default_language = params[:default_language].to_s
    available_languages = Array(params[:available_languages]).map(&:to_s) & Elvis::SUPPORTED_LOCALES

    unless Elvis::SUPPORTED_LOCALES.include?(default_language) && available_languages.include?(default_language)
      return render json: {
        success: false,
        message: "La langue par défaut doit faire partie des langues disponibles."
      }, status: :unprocessable_entity
    end

    ActiveRecord::Base.transaction do
      default_language_param = Parameter.find_or_create_by(label: "app.localization.default_language", value_type: "string")
      default_language_param.value = default_language
      default_language_param.save!

      available_languages_param = Parameter.find_or_create_by(label: "app.localization.available_languages", value_type: "json")
      available_languages_param.value = available_languages.to_json
      available_languages_param.save!
    end

    respond_to do |format|
      format.json { render json: { success: true } }
    end
  end
end
