# frozen_string_literal: true

module Elvis
  # Resolves config.time_zone (a Rails TimeZone name, e.g. "Paris" - see config/application.rb's
  # SCHOOL_TIMEZONE env var) to the real IANA identifier (e.g. "Europe/Paris") frontend code needs
  # for Intl.DateTimeFormat. Single source of truth: nothing hardcodes the IANA name separately.
  module SchoolTimezone
    def self.iana_name
      ActiveSupport::TimeZone[Rails.application.config.time_zone].tzinfo.name
    end
  end
end
