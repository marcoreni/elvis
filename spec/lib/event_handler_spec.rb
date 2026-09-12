# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the Style/ClassVars cleanup on EventHandler: @@semaphore was
# a `@@` class variable. EventHandler has no subclasses and the mutex is only ever
# touched from EventHandler's own class methods (self.method_missing), so it was
# converted to a plain class instance variable (@semaphore, set once in the class body)
# with the same synchronize semantics. This spec pins down that the dynamic
# EventHandler.<domain> accessor generation (and its memoization) still works.
RSpec.describe EventHandler do
  it "dynamically defines and memoizes a class method per domain name" do
    group = EventHandler.a_spec_test_domain

    expect(group).to be_a(EventGroup)
    expect(EventHandler.a_spec_test_domain).to equal(group)
  end

  it "returns distinct EventGroups for distinct domain names" do
    expect(EventHandler.another_spec_domain_one).not_to equal(EventHandler.another_spec_domain_two)
  end
end
