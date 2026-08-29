require "rails_helper"

RSpec.describe Parameter, type: :model do
  describe "cache invalidation" do
    # Parameter.get_value caches for 1h (Rails.cache.fetch("parameter_<label>", expires_in: 1.hour)).
    # Regression test for PR #5 finding #1: several Parameters::*Controller actions write through
    # this model expecting the change to take effect immediately, but nothing expired that cache
    # entry on save/destroy before now. (Rails.cache.clear runs before every example globally —
    # see spec/rails_helper.rb — so no per-spec cache cleanup is needed here.)
    it "makes a saved change visible to Parameter.get_value immediately, not after the cache TTL" do
      parameter = Parameter.create!(label: "spec.cache_test", value_type: "string", value: "before")
      expect(Parameter.get_value("spec.cache_test")).to eq("before")

      parameter.update!(value: "after")

      expect(Parameter.get_value("spec.cache_test")).to eq("after")
    end

    it "stops serving a destroyed parameter's cached value" do
      parameter = Parameter.create!(label: "spec.cache_test_destroy", value_type: "string", value: "present")
      expect(Parameter.get_value("spec.cache_test_destroy", default: "fallback")).to eq("present")

      parameter.destroy!

      expect(Parameter.get_value("spec.cache_test_destroy", default: "fallback")).to eq("fallback")
    end
  end

  describe ".get_values" do
    it "returns parsed values keyed by label, applying per-label defaults for misses" do
      Parameter.create!(label: "spec.multi.a", value_type: "string", value: "alpha")
      Parameter.create!(label: "spec.multi.list", value_type: "json", value: %w[x y].to_json)

      result = Parameter.get_values(
        "spec.multi.a", "spec.multi.list", "spec.multi.missing",
        defaults: { "spec.multi.missing" => "fallback" }
      )

      expect(result).to eq(
        "spec.multi.a" => "alpha",
        "spec.multi.list" => %w[x y],
        "spec.multi.missing" => "fallback"
      )
    end

    it "reads through the same cache keys as get_value (one read_multi, no DB on a warm cache)" do
      Parameter.create!(label: "spec.multi.shared", value_type: "string", value: "cached")
      # prime the "parameter_spec.multi.shared" cache entry via get_value
      Parameter.get_value("spec.multi.shared")

      expect(Rails.cache).to receive(:read_multi).once.with("parameter_spec.multi.shared").and_call_original
      expect(Parameter).not_to receive(:where) # all hits, no DB fallback

      expect(Parameter.get_values("spec.multi.shared")).to eq("spec.multi.shared" => "cached")
    end

    it "resolves all misses in a single SELECT" do
      Parameter.create!(label: "spec.multi.q1", value_type: "string", value: "one")
      Parameter.create!(label: "spec.multi.q2", value_type: "string", value: "two")

      expect(Parameter).to receive(:where).once.with(label: %w[spec.multi.q1 spec.multi.q2]).and_call_original

      expect(Parameter.get_values("spec.multi.q1", "spec.multi.q2")).to eq(
        "spec.multi.q1" => "one", "spec.multi.q2" => "two"
      )
    end

    it "picks up a change immediately (shares expire_cache with get_value)" do
      parameter = Parameter.create!(label: "spec.multi.invalidate", value_type: "string", value: "before")
      expect(Parameter.get_values("spec.multi.invalidate")).to eq("spec.multi.invalidate" => "before")

      parameter.update!(value: "after")

      expect(Parameter.get_values("spec.multi.invalidate")).to eq("spec.multi.invalidate" => "after")
    end
  end
end
