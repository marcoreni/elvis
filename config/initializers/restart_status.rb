# frozen_string_literal: true

# Puma's tmp_restart plugin (config/puma.rb's `plugin :tmp_restart`) creates tmp/restart.txt once,
# the first time any process boots, and never deletes it. A restart is signaled by the file's
# *mtime* moving forward -- PluginsController#changed bumps it by rewriting the file -- not by the
# file merely existing. `File.exist?` on that path is therefore true forever on any booted server;
# checking existence alone makes "is a restart pending" permanently true.
#
# Capture this process's own boot-time mtime baseline here, once, so PluginsController#index can
# tell "a restart was requested since I booted" apart from "the file exists".
module RestartStatus
  class << self
    attr_accessor :file_path, :baseline_mtime
  end

  self.file_path = Rails.root.join("tmp", "restart.txt")
  self.baseline_mtime = File.exist?(file_path) ? File.mtime(file_path) : nil

  # True only while a restart has been requested (the file's mtime moved past this process's own
  # boot-time baseline) but this process hasn't yet been replaced by the restarted one -- the new
  # process re-runs this initializer and captures a fresh, already-settled baseline, so it reports
  # false again immediately after the actual restart completes.
  def self.restarting?
    File.exist?(file_path) && File.mtime(file_path) != baseline_mtime
  end
end
