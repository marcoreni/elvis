# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the Style/ClassVars cleanup on Elvis::Hook: @@listener_classes,
# @@listeners and @@hook_listeners were `@@` class variables. Elvis::Hook is a plain
# module accessed only through its own `class << self` singleton methods (nothing else
# includes/extends the module itself), so they were converted to class instance
# variables with identical semantics. This spec pins down listener registration,
# memoization, clearing, and call_hook dispatch.
RSpec.describe Elvis::Hook do
  # Save/restore real module state around each example so this doesn't leak test
  # listeners into other specs (call_hook is exercised by view/controller rendering
  # elsewhere in the suite).
  around do |example|
    original_classes = Elvis::Hook.instance_variable_get(:@listener_classes)
    Elvis::Hook.instance_variable_set(:@listener_classes, [])
    Elvis::Hook.clear_listeners_instances
    example.run
    Elvis::Hook.instance_variable_set(:@listener_classes, original_classes)
    Elvis::Hook.clear_listeners_instances
  end

  it "registers a Listener subclass automatically via .inherited and calls it via call_hook" do
    listener_class = Class.new(Elvis::Hook::Listener) do
      def my_spec_hook(context)
        "handled #{context[:foo]}"
      end
    end

    expect(Elvis::Hook.listeners).to include(an_instance_of(listener_class))
    expect(Elvis::Hook.call_hook(:my_spec_hook, foo: "bar")).to eq(["handled bar"])
  end

  it "memoizes hook_listeners per hook and busts the cache when listeners are cleared" do
    Class.new(Elvis::Hook::Listener) do
      def another_spec_hook(_context)
        "ok"
      end
    end

    first = Elvis::Hook.hook_listeners(:another_spec_hook)
    expect(Elvis::Hook.hook_listeners(:another_spec_hook)).to equal(first)

    Elvis::Hook.clear_listeners_instances
    expect(Elvis::Hook.hook_listeners(:another_spec_hook)).not_to equal(first)
  end

  it "returns an empty array from call_hook when no listener responds to the hook" do
    expect(Elvis::Hook.call_hook(:no_such_spec_hook)).to eq([])
  end
end
