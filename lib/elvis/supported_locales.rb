# frozen_string_literal: true

module Elvis
  # Locale codes the codebase ships translation files for. An installation's
  # `app.localization.available_languages` Parameter must be a subset of this list — see
  # docs/I18n.md for how to add a new language.
  SUPPORTED_LOCALES = %w[fr en].freeze

  # Symbol form of SUPPORTED_LOCALES, precomputed once — used on every request by locale
  # resolution, so avoid reallocating an array via `.map(&:to_sym)` per request.
  SUPPORTED_LOCALES_SYMBOLS = SUPPORTED_LOCALES.map(&:to_sym).freeze
end
