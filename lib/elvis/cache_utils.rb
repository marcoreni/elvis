# frozen_string_literal: true

module Elvis
  class CacheUtils
    def self.cache_block_if_enabled(key,
                                    expires_in: Parameter.get_value("app.cache.default_duration",
                                                                    default: 5.minutes), &block)
      if Parameter.get_value("app.cache.enabled")
        Rails.cache.fetch(key, expires_in: expires_in, &block)
      else
        yield
      end
    end
  end
end
