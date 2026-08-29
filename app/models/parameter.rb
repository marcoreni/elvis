# frozen_string_literal: true

# == Schema Information
#
# Table name: parameters
#
#  id         :bigint           not null, primary key
#  label      :string
#  value      :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  value_type :string           default("string")
#
class Parameter < ApplicationRecord
  after_commit :expire_cache

  def parse
    case value_type
    when "json"
      JSON.parse(value)
    when "float"
      value.to_f
    when "int", "integer"
      value.to_i
    when "boolean", "bool"
      value == "true"
    when "duration"
      begin
        value.to_i.send(value.split(".").last || "minutes")
      rescue StandardError
        nil
      end
    else
      value
    end
  end

  def self.get_value(label, default: nil)
    Rails.cache.fetch("parameter_#{label}", expires_in: 1.hour) do
      p = Parameter.find_by(label: label)

      p.nil? ? nil : p.parse
    end || default
  end

  # Like get_value, for several labels at once, but batched on both sides: one cache read_multi
  # for the hits and a single SELECT for any misses (vs. one cache GET + one find_by per label).
  # Uses the same "parameter_<label>" keys and 1h TTL as get_value, so expire_cache still
  # invalidates entries written here. Returns { label => parsed_value_or_default }.
  def self.get_values(*labels, defaults: {})
    key_for = labels.index_with { |label| "parameter_#{label}" }
    cached = Rails.cache.read_multi(*key_for.values)

    missing = labels.reject { |label| cached.key?(key_for[label]) }
    unless missing.empty?
      found = Parameter.where(label: missing).index_by(&:label)
      fresh = missing.index_with { |label| found[label]&.parse }
      Rails.cache.write_multi(fresh.transform_keys { |label| key_for[label] }, expires_in: 1.hour)
      cached.merge!(fresh.transform_keys { |label| key_for[label] })
    end

    labels.index_with { |label| cached[key_for[label]] || defaults[label] }
  end

  private

  # Without this, any save/destroy leaves Parameter.get_value's cache (keyed by label, 1h TTL)
  # serving the pre-write value until it naturally expires — several Parameters::*Controller
  # actions write through this model expecting the change to take effect immediately.
  def expire_cache
    Rails.cache.delete("parameter_#{label}")
  end
end
