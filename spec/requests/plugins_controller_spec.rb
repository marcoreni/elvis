# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "`Plugins.jsx`'s restart banner
# self-dismisses regardless of actual restart status": PluginsController#index's JSON branch
# never returned an `is_restarting` key, so Plugins.jsx's 3-second poll (checkRestartStatus,
# reading the same key) always saw `undefined` and dismissed the restart banner on the very
# first poll. #index now reports real restart state by checking whether `tmp/restart.txt` is
# still present. #changed's response key (`restart`) is intentionally left alone --
# Plugins.jsx#handleSaveAndRestart reads `res.restart`, not `res.is_restarting`, from it.
RSpec.describe "GET /plugins", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "plugins-spec-admin@example.com", is_admin: true) }
  let(:restart_file) { Rails.root.join("tmp", "restart.txt") }

  before { sign_in admin }

  after { FileUtils.rm_f(restart_file) }

  it "returns is_restarting: false when tmp/restart.txt is absent" do
    FileUtils.rm_f(restart_file)

    get "/plugins.json"

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)
    expect(json["is_restarting"]).to eq(false)
  end

  it "returns is_restarting: true when tmp/restart.txt is present" do
    File.write(restart_file, "restart")

    get "/plugins.json"

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)
    expect(json["is_restarting"]).to eq(true)
  end
end
