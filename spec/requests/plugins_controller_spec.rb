# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "`Plugins.jsx`'s restart banner
# self-dismisses regardless of actual restart status": PluginsController#index's JSON branch
# never returned an `is_restarting` key, so Plugins.jsx's 3-second poll (checkRestartStatus,
# reading the same key) always saw `undefined` and dismissed the restart banner on the very
# first poll. #index now reports real restart state via RestartStatus.restarting?
# (config/initializers/restart_status.rb). #changed's response key (`restart`) is intentionally
# left alone -- Plugins.jsx#handleSaveAndRestart reads `res.restart`, not `res.is_restarting`,
# from it.
#
# IMPORTANT: tmp/restart.txt is Puma's tmp_restart plugin file (config/puma.rb) -- it's created
# once at the real server's first boot and never deleted; a restart is signaled by its *mtime*
# moving forward, not by its existence (which is permanently true on any booted server). So these
# specs stub RestartStatus.file_path/.baseline_mtime to a throwaway path under tmp/ rather than
# touching the real, live-operational tmp/restart.txt (which a real running Puma process may be
# polling, and which two concurrent spec runs on one checkout would otherwise race on).
RSpec.describe "GET /plugins", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "plugins-spec-admin@example.com", is_admin: true) }
  let(:stub_restart_file) { Rails.root.join("tmp", "rspec-restart-#{SecureRandom.hex(8)}.txt") }

  before { sign_in admin }

  around do |example|
    original_path = RestartStatus.file_path
    original_baseline = RestartStatus.baseline_mtime
    RestartStatus.file_path = stub_restart_file

    example.run

    FileUtils.rm_f(stub_restart_file)
    RestartStatus.file_path = original_path
    RestartStatus.baseline_mtime = original_baseline
  end

  def fetch_is_restarting
    get "/plugins.json"
    expect(response).to have_http_status(:ok)
    JSON.parse(response.body)["is_restarting"]
  end

  it "returns is_restarting: false when the restart file doesn't exist" do
    RestartStatus.baseline_mtime = nil

    expect(fetch_is_restarting).to eq(false)
  end

  it "returns is_restarting: false when the file's mtime hasn't moved past this process's boot baseline" do
    File.write(stub_restart_file, "")
    RestartStatus.baseline_mtime = File.mtime(stub_restart_file)

    expect(fetch_is_restarting).to eq(false)
  end

  it "returns is_restarting: true when the file's mtime has moved past this process's boot baseline" do
    File.write(stub_restart_file, "")
    RestartStatus.baseline_mtime = File.mtime(stub_restart_file)

    # Simulate PluginsController#changed bumping the file's mtime to request a restart.
    File.utime(Time.now, Time.now + 10, stub_restart_file)

    expect(fetch_is_restarting).to eq(true)
  end
end
