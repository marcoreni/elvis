# frozen_string_literal: true

class LiquidDrops::JsonDrop < Liquid::Drop
  # rubocop:disable Lint/MissingSuper -- see app/mailers/liquid_drops/activity_drop.rb: skipping
  # Liquid::Drop#initialize's @context = nil is harmless, Liquid sets drop.context= itself.
  def initialize(json)
    raise ArgumentError, "Expected a Hash, got: #{json.class}" unless json.is_a?(Hash)

    @json = json

    @json.each do |key, value|
      if value.is_a?(Hash)
        define_singleton_method(key) { LiquidDrops::JsonDrop.new(value) }
      else
        define_singleton_method(key) { value }
      end
    end
  end
  # rubocop:enable Lint/MissingSuper
end
