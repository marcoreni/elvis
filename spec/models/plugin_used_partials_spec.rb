# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the Style/ClassVars cleanup on Plugin: @@used_partials was a
# `@@` class variable, shared across the entire inheritance hierarchy. Plugin has no
# subclasses, so this converts it to a class instance variable (Plugin.used_partials,
# via `class << self; attr_accessor :used_partials; end`) instead -- same semantics
# for this class, without the cross-hierarchy-sharing footgun. This spec pins down
# that #register_settings' collision bookkeeping and warning still work.
RSpec.describe Plugin do
  around do |example|
    original = Plugin.used_partials
    Plugin.used_partials = {}
    example.run
    Plugin.used_partials = original
  end

  def build_plugin(name)
    plugin = Plugin.new(name: name)
    # Isolate the behavior under test (the used_partials bookkeeping) from the unrelated
    # Setting subsystem, which #register_settings also touches.
    setting = instance_double(Setting, value: nil, "value=": nil)
    allow(Setting).to receive(:find_or_create_by!).and_yield(setting).and_return(setting)
    allow(Setting).to receive(:define_plugin_setting)
    plugin
  end

  it "records which plugin first registered a given settings partial" do
    plugin = build_plugin("plugin_a")

    plugin.register_settings("partial" => "shared_partial")

    expect(Plugin.used_partials["shared_partial"]).to eq("plugin_a")
  end

  it "warns, but doesn't raise, when a second plugin reuses an already-registered partial" do
    build_plugin("plugin_a").register_settings("partial" => "shared_partial")
    second_plugin = build_plugin("plugin_b")

    expect(Rails.logger).to receive(:warn).with(/shared_partial.*plugin_a/m)
    expect { second_plugin.register_settings("partial" => "shared_partial") }.not_to raise_error

    # last writer wins, same as the previous @@used_partials-backed behavior
    expect(Plugin.used_partials["shared_partial"]).to eq("plugin_b")
  end
end
