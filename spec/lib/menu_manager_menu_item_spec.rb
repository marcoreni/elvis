# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the Lint/DuplicateMethods cleanup on
# Elvis::MenuManager::MenuItem: the class used to attr_reader :url and :position
# alongside separate `def url` / `def position` overrides further down, which made the
# attr_reader-generated readers dead code (silently shadowed by the explicit methods
# that always run). The attr_reader entries for :url and :position were removed;
# this spec pins down that the still-live custom implementations keep working exactly
# as before.
RSpec.describe Elvis::MenuManager::MenuItem do
  describe "#url" do
    it "returns the explicit :url option when given, without touching route_params" do
      item = described_class.new(:my_item, "my_controller", "my_action", url: "/explicit-path", position: 1)

      expect(item.url).to eq("/explicit-path")
    end

    it "computes the url from controller/action/route_params when no :url option is given" do
      item = described_class.new(:my_item, "sessions", "new", position: 1)

      expect(item.url).to eq(item.url_for(action: "new", controller: "sessions", only_path: true))
    end
  end

  describe "#position" do
    it "returns the explicit :position option when given" do
      item = described_class.new(:my_item, "my_controller", "my_action", position: 42)

      expect(item.position).to eq(42)
    end

    it "falls back to the current side_menu length when no :position option is given" do
      expected = Elvis::MenuManager.menu_length(:side_menu)
      item = described_class.new(:my_item, "my_controller", "my_action")

      expect(item.position).to eq(expected)
    end
  end
end
