require "rails_helper"

RSpec.describe Parameter, type: :model do
  describe "cache invalidation" do
    # Parameter.get_value caches for 1h (Rails.cache.fetch("parameter_<label>", expires_in: 1.hour)).
    # Regression test for PR #5 finding #1: several Parameters::*Controller actions write through
    # this model expecting the change to take effect immediately, but nothing expired that cache
    # entry on save/destroy before now.
    #
    # Rails.cache is a real FileStore in the test env (persists across separate test runs, unlike
    # the DB which DatabaseCleaner rolls back) — clear these specific keys first so a previous
    # run's cached value can't leak in and produce a false pass/fail here.
    before do
      Rails.cache.delete("parameter_spec.cache_test")
      Rails.cache.delete("parameter_spec.cache_test_destroy")
    end

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
end
