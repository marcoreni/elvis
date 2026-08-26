# frozen_string_literal: true

module Elvis
  # Locale codes the codebase ships translation files for. An installation's
  # `app.localization.available_languages` Parameter must be a subset of this list — see
  # docs/I18n.md for how to add a new language.
  SUPPORTED_LOCALES = %w[fr en].freeze
end
