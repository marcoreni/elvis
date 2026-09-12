ActiveJob::Status.store = :file_store, "/tmp/file_store" if Rails.cache.is_a?(ActiveSupport::Cache::NullStore)

ActiveJob::Status.options = { includes: %i[status exception] }
