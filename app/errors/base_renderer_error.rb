# frozen_string_literal: true

class BaseRendererError < StandardError
  attr_accessor :sup_message

  def initialize(message, code)
    super(message)

    @code = code
  end

  attr_reader :code

  def with_message(message)
    duplicated = dup

    duplicated.sup_message = message

    duplicated
  end
end
