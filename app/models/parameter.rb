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
  #
  # A row whose #parse raises is isolated to its own label — logged, treated as "no value"
  # (default) for this call, and deliberately NOT written to the cache, so get_value on the same
  # key keeps its own behavior (raise) and a raw-SQL repair is picked up on the next call rather
  # than masked by a cached nil for up to an hour.
  #
  # Duplicate `label` rows (there is no unique index) are resolved deterministically to the
  # lowest id; get_value's plain find_by has no ORDER BY, so which row it returns is DB-order
  # dependent — usually, but not guaranteed, the same one.
  #
  # Labels and `defaults` keys are stringified (the DB column is a string); like get_value, a
  # nil result (absent row, or an isolated parse failure) falls to the label's default, but a
  # stored `false`/`0`/`""` is returned as-is.
  def self.get_values(*labels, defaults: {})
    labels = labels.map(&:to_s)
    defaults = defaults.transform_keys(&:to_s)
    key_for = labels.index_with { |label| "parameter_#{label}" }
    cached = Rails.cache.read_multi(*key_for.values)
    missing = labels.reject { |label| cached.key?(key_for[label]) }

    if missing.any?
      rows = Parameter.where(label: missing).order(id: :desc).index_by(&:label)
      to_cache = {}

      missing.each do |label|
        value = rows[label]&.parse
        to_cache[key_for[label]] = value
        cached[key_for[label]] = value
      rescue StandardError => e
        Rails.logger.error("[Parameter] get_values: #{label.inspect} failed to parse: #{e.message}")
      end

      Rails.cache.write_multi(to_cache, expires_in: 1.hour) if to_cache.any?
    end

    labels.index_with do |label|
      value = cached[key_for[label]]
      value.nil? ? defaults[label] : value
    end
  end

  private

  # Without this, any save/destroy leaves Parameter.get_value's cache (keyed by label, 1h TTL)
  # serving the pre-write value until it naturally expires — several Parameters::*Controller
  # actions write through this model expecting the change to take effect immediately.
  def expire_cache
    Rails.cache.delete("parameter_#{label}")
  end
end
