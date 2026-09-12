# frozen_string_literal: true

require_relative "base_listener"
require_relative "../jobs/error_register_job"

IGNORED_ERROR_CLASSES = [
  Errno::ENOTDIR,
  Errno::ESRCH
].freeze

module RaiseOverride
  def initialize(message = nil, code = nil)
    super(message, code)

    if is_a?(BaseRendererError) &&
       !IGNORED_ERROR_CLASSES.include?(self.class) &&
       self.class.const_defined?(:ErrorCode) &&
       ErrorCode.const_defined?(:SYSTEM_EXCEPTION) &&
       !ErrorCode::SYSTEM_EXCEPTION.nil?

      begin
        register_exception(self, [])
      rescue StandardError => e
        Rails.logger.error("ErrorCatcher: #{e.message}")
      end

    end
  end

  # @param [RaiseOverride] exception
  # @param [Array] args
  def register_exception(exception, _args)
    related_objects = {}

    if respond_to?(:current_user)
      related_objects[:current_user] = {
        class: current_user&.class&.name,
        id: current_user&.id
      }
    end

    instance_variables.each do |var|
      var_value = instance_variable_get(var)

      if var_value.is_a?(ActiveRecord::Base) && var_value.respond_to?(:id)
        related_objects[var] = { class: var_value.class.name, id: var_value.id }
      end
    end

    stacktrace = exception.backtrace || caller || []

    # on retire la première ligne qui est celle de la méthode raise
    stacktrace = stacktrace[1..-1] if stacktrace.first&.include?("error_catcher.rb")

    ErrorRegisterJob.perform_later({
                                     error_code_id: exception.respond_to?(:code) ? ErrorCode.find_by(code: exception.code)&.id : ErrorCode::SYSTEM_EXCEPTION.id,
                                     stack_trace: stacktrace[0..6],
                                     related_objects: related_objects,
                                     message: if exception.respond_to?(:sup_message)
                                                exception.sup_message
                                              else
                                                exception.message
                                              end
                                   })
  end
end

class ErrorCatcher < BaseListener
  def self.subscribe
    Rails.application.config.after_initialize do
      if defined?(BaseRendererError) && !BaseRendererError.ancestors.include?(RaiseOverride)
        BaseRendererError.prepend RaiseOverride
      end
    end
  end
end
