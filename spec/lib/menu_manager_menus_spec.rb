# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the Style/ClassVars cleanup on Elvis::MenuManager: @@menus was
# a `@@` class variable. Elvis::MenuManager is a plain module accessed only through its
# own `self.` methods (nothing includes/extends the module itself), so it was converted
# to a class instance variable (@menus) with identical semantics. This spec pins down
# .add_menu/.get_menu/.menus/.clear_menus round-tripping.
RSpec.describe Elvis::MenuManager do
  around do |example|
    original = Elvis::MenuManager.menus
    Elvis::MenuManager.instance_variable_set(:@menus, original.dup)
    example.run
    Elvis::MenuManager.instance_variable_set(:@menus, original)
  end

  it "creates and retrieves a named menu" do
    Elvis::MenuManager.add_menu(:spec_test_menu)

    expect(Elvis::MenuManager.get_menu(:spec_test_menu)).to eq([])
    expect(Elvis::MenuManager.menus).to have_key(:spec_test_menu)
  end

  it "does not reset an existing menu's items when added again" do
    Elvis::MenuManager.add_menu(:spec_test_menu)
    Elvis::MenuManager.get_menu(:spec_test_menu) << :an_item

    Elvis::MenuManager.add_menu(:spec_test_menu)

    expect(Elvis::MenuManager.get_menu(:spec_test_menu)).to eq([:an_item])
  end

  it "clears all menus" do
    Elvis::MenuManager.add_menu(:spec_test_menu)

    Elvis::MenuManager.clear_menus

    expect(Elvis::MenuManager.menus).to eq({})
  end
end
