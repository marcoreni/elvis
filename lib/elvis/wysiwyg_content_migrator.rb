# frozen_string_literal: true

module Elvis
  # Owns the DB reads/writes/logging for the one-time `elvis:migrate_wysiwyg_content` rake task
  # (lib/tasks/elvis.rake) -- the task itself only sets up ENV/logger and calls #run!. Pulled out
  # so this logic (DRY_RUN parsing, duplicate-label handling, the lost-update guard, the
  # value_type guard, the end-of-run safety scan) gets normal RSpec coverage instead of only
  # Rake::Task#invoke coverage.
  class WysiwygContentMigrator
    KNOWN_LABELS = %w[
      payment_step.display_text
      pricing_info_application.display_text
      availability_info_application.display_text
    ].freeze

    # Values that, despite being non-empty, must NOT enable dry-run -- everything else non-empty
    # does. This deliberately biases towards "accidentally previewed" over "accidentally wrote":
    # on a one-time production migration, a DRY_RUN=true/yes/on typo must still preview, not
    # silently fall through to a real write.
    FALSY_VALUES = %w[0 false no off].freeze

    STDERR_LOG_LIMIT = 2000

    def self.dry_run?(env_value)
      return false if env_value.nil?

      value = env_value.to_s.strip
      return false if value.empty?

      !FALSY_VALUES.include?(value.downcase)
    end

    def initialize(dry_run:, logger:, prefix: "", task_name: "elvis:migrate_wysiwyg_content")
      @dry_run = dry_run
      @logger = logger
      @prefix = prefix
      @task_name = task_name
    end

    def run!
      KNOWN_LABELS.each { |label| process_label(label) }
      scan_for_unexpected_rows
    end

    private

    attr_reader :dry_run, :logger, :prefix, :task_name

    def process_label(label)
      parameters = Parameter.where(label: label).order(:id).to_a

      if parameters.empty?
        logger.info "#{label}: no row for this label, skipping"
        return
      end

      multiple = parameters.size > 1
      parameters.each { |parameter| process_parameter(parameter, label: label, multiple: multiple) }
    end

    def process_parameter(parameter, label:, multiple:)
      name = multiple ? "#{label} (id=#{parameter.id})" : label

      unless parameter.value_type == "string"
        logger.warn "#{name}: value_type is #{parameter.value_type.inspect}, not \"string\" -- " \
                    "skipping (writing HTML into a non-string parameter would break Parameter#parse)"
        return
      end

      value = parameter.value

      if value.blank?
        logger.info "#{name}: value is blank, skipping"
        return
      end

      result = convert_or_abort(value, name: name)

      unless result.is_draft_js
        logger.info "#{name}: already HTML/plain, skipping"
        return
      end

      if result.failed
        reason = result.stderr.present? ? " -- #{truncate(result.stderr)}" : ""
        logger.error "#{name}: Draft.js content FAILED to convert#{reason} -- left untouched, " \
                     "needs human investigation"
        return
      end

      old_length = value.length
      new_length = result.html.length

      if dry_run
        logger.info "#{name}: would convert Draft.js JSON to HTML (length #{old_length} -> " \
                    "#{new_length}); no write performed"
        return
      end

      write_converted_value(parameter, name: name, original_value: value, result: result)
    end

    def convert_or_abort(value, name:)
      Elvis::WysiwygConverter.convert(value)
    rescue Elvis::WysiwygConverter::BridgeError => e
      abort "#{prefix}#{task_name}: aborting, the wysiwyg conversion bridge failed on #{name}: #{e.message}"
    end

    # Guards against a lost update: `parameter.value` was read tens of ms ago, so an admin save
    # through the real app in that window must not be silently clobbered by this migration
    # rewriting the (now-stale) converted old content. update_all bypasses Parameter's
    # after_commit :expire_cache callback, so the cache key is deleted explicitly below --
    # otherwise Parameter.get_value keeps serving the pre-migration Draft.js JSON for up to 1h.
    def write_converted_value(parameter, name:, original_value:, result:)
      scope = Parameter.where(id: parameter.id, value: original_value)
      affected = scope.update_all(value: result.html, updated_at: Time.current)

      if affected.zero?
        logger.error "#{name}: value changed since it was read (concurrent save?) -- skipping " \
                     "without writing, re-run the task to pick it up"
        return
      end

      Rails.cache.delete("parameter_#{parameter.label}")
      logger.info "#{name}: converted Draft.js JSON to HTML (length #{original_value.length} -> " \
                  "#{result.html.length})"
    end

    # Cheap end-of-run safety net: the 3 KNOWN_LABELS are correct today, but nothing stops a 4th
    # wysiwyg-shaped row existing via the plugin system or dynamic parameter creation. Read-only
    # in both dry-run and real mode -- never writes.
    def scan_for_unexpected_rows
      suspects = Parameter.where("value LIKE ?", '%"blocks"%').where.not(label: KNOWN_LABELS)

      if suspects.none?
        logger.info "safety scan: no Draft.js-shaped content found outside the " \
                    "#{KNOWN_LABELS.size} known labels"
        return
      end

      suspects.each do |p|
        logger.warn "UNEXPECTED possible Draft.js content outside the known labels: Parameter " \
                    "id=#{p.id} label=#{p.label.inspect} -- not migrated by this task, investigate manually"
      end
    end

    def truncate(text, limit: STDERR_LOG_LIMIT)
      text = text.strip
      text.length > limit ? "#{text[0, limit]}... (truncated, #{text.length} bytes total)" : text
    end
  end
end
