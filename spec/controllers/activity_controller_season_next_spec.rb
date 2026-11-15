# frozen_string_literal: true

require "rails_helper"

# Regression coverage for docs/KnownIssues.md's "Season.next crashes with NoMethodError when no
# season is flagged is_current": #get_availabilities used to call `next_season.start`/`.end`
# unconditionally, raising when Season.next was nil instead of returning an empty JSON listing.
RSpec.describe ActivityController, type: :controller do
  include Devise::Test::ControllerHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:user) { FactoryBot.create(:user, email: "season-next-availabilities@example.com") }

  before { sign_in user }

  describe "POST #get_availabilities" do
    it "returns an empty list instead of raising when there is no next season" do
      # The guard short-circuits before any activity_ref_id is actually looked up, so a
      # non-existent id is enough to exercise the array-param path without needing a real
      # ActivityRef record.
      post :get_availabilities, params: { activity_ref_ids: [999_999] }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq([])
    end
  end
end
