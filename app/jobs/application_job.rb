# frozen_string_literal: true

class ApplicationJob < ActiveJob::Base
  queue_as :default

  # `I18n.locale` is set per-request by ApplicationController#switch_locale, but that only lives
  # for the lifetime of the request thread -- nothing propagates it into a background job's own
  # execution thread. Without this, any I18n.t call made from inside `perform` (progress text,
  # error messages, ...) always resolves against I18n.default_locale, regardless of which locale
  # the user who enqueued the job had selected.
  #
  # Convention for any job that wants its user-facing text localized: accept a `locale:` keyword
  # argument in `perform` and have the caller pass `locale: I18n.locale.to_s` at enqueue time (see
  # CsvImporterJob for an example). This around_perform picks that keyword argument back up --
  # regardless of the job's other (positional or keyword) arguments -- and wraps the whole
  # perform/callback chain in `I18n.with_locale`. A job that doesn't declare/receive a `locale:`
  # keyword argument is unaffected and keeps resolving I18n.t against the default locale, exactly
  # as before this was added.
  around_perform do |_job, block|
    trailing_options = arguments.last
    locale = trailing_options[:locale] || trailing_options["locale"] if trailing_options.is_a?(Hash)

    I18n.with_locale(locale.presence || I18n.default_locale, &block)
  end
end
