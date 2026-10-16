# frozen_string_literal: true

require "open3"

module Elvis
  # Bridges to the Node CLI (frontend/tools/wysiwygConversionCli.js) that performs the
  # Draft.js-raw-JSON -> HTML conversion already reviewed/tested on the frontend side (see
  # frontend/tools/wysiwygConversion.js's `convertWysiwyg`). This class deliberately does not
  # reimplement that conversion, or its Draft.js-format detection, in Ruby -- see the seam
  # contract documented at the top of the CLI script and in
  # lib/tasks/elvis.rake's `elvis:migrate_wysiwyg_content` task, the only caller.
  class WysiwygConverter
    # Raised only when the bridge itself is broken: node/the CLI script missing, a non-zero
    # exit code, a timeout, or stdout that doesn't match one of the contract's 3 known shapes.
    # Never raised for "this one row's content failed to convert" -- that's Result#failed, a
    # legitimate exit-0 verdict.
    class BridgeError < StandardError; end

    Result = Struct.new(:is_draft_js, :html, :failed, :stderr, keyword_init: true)

    CLI_SCRIPT_RELATIVE_PATH = File.join("frontend", "tools", "wysiwygConversionCli.js")

    # Non-Draft.js, non-blank input (the contract forbids blank stdin) used by #ensure_available!
    # to push a real round-trip through the CLI rather than just checking that `node` exists.
    CANARY_INPUT = "<p>x</p>"

    # A wedged/hung `node` child would otherwise block the migration rake task forever with no
    # output. 30s is generous for a single-row conversion -- real rows are a handful of KB.
    DEFAULT_TIMEOUT_SECONDS = 30

    class << self
      # Fails loudly and early (call once, before looping over rows) if the bridge can't
      # possibly run, rather than discovering that per-row. Pushes a real canary value through
      # the full CLI contract (not just `node --version`) so a broken `node_modules` on a
      # precompiled-assets-only deploy host is caught here too.
      # @raise [BridgeError]
      def ensure_available!
        script_path = cli_script_path
        raise BridgeError, "wysiwygConversionCli script not found at #{script_path}" unless File.exist?(script_path)

        result = convert(CANARY_INPUT)
        return if result.is_draft_js == false && result.failed == false && result.html == CANARY_INPUT

        raise BridgeError, "wysiwygConversionCli canary check failed (expected isDraftJs:false, " \
                           "failed:false, html==#{CANARY_INPUT.inspect}): got #{result.to_h.inspect}"
      end

      # @param raw_value [String] the Parameter row's raw `value`. Must not be blank/nil --
      #   callers must skip blank values without invoking the bridge (per the seam contract).
      # @return [Result]
      # @raise [BridgeError] if the bridge itself is broken.
      def convert(raw_value)
        raise ArgumentError, "raw_value must not be blank" if raw_value.nil? || raw_value.empty?

        stdout, stderr, status =
          begin
            capture3_with_timeout("node", cli_script_path, stdin_data: raw_value, chdir: Rails.root.to_s)
          rescue Errno::ENOENT => e
            raise BridgeError, "failed to invoke node: #{e.message}"
          end

        unless status.success?
          detail = stderr.present? ? " (stderr: #{stderr.strip})" : ""
          raise BridgeError, "wysiwygConversionCli exited with status #{status.exitstatus}#{detail}"
        end

        Rails.logger.warn("[Elvis::WysiwygConverter] wysiwygConversionCli stderr: #{stderr.strip}") if stderr.present?

        parse_result(stdout, stderr)
      end

      private

      def cli_script_path
        Rails.root.join(CLI_SCRIPT_RELATIVE_PATH).to_s
      end

      # Open3.capture3 has no timeout option, so this drives Open3.popen3 directly: stdin is
      # written and stdout/stderr are read on their own threads (same reason Open3.capture3
      # itself uses threads -- avoids a deadlock if the child fills a pipe buffer before being
      # fully read), and `wait_thr.join(timeout)` bounds how long we wait for the child to exit.
      # On timeout the child is killed and reaped (never left as a zombie) and BridgeError is
      # raised -- a distinct failure mode from a per-row content failure, which is always exit 0.
      #
      # The stdin-writer thread also rescues Errno::EPIPE: a child that dies before draining
      # stdin (a corrupted checkout, a node version that can't parse the CLI script, an
      # OOM-killed node) closes its end of the pipe, and writing more than a pipe-buffer's worth
      # of data (stdin_data over ~64KB -- plausible for a Draft.js row with an embedded base64
      # image) then raises EPIPE on this thread, which `stdin_writer.join` below would otherwise
      # re-raise as an uncaught exception instead of the clean BridgeError this bridge promises.
      # Ruby's own lib/open3.rb wraps capture3's stdin write in the same rescue for the same
      # reason. The child's death is still surfaced correctly: it exits non-zero, so the
      # `status.success?` check in #convert raises BridgeError -- this rescue only prevents the
      # write failure itself from masking that with a raw thread backtrace.
      def capture3_with_timeout(*cmd, stdin_data: nil, chdir: nil, timeout: DEFAULT_TIMEOUT_SECONDS)
        opts = {}
        opts[:chdir] = chdir if chdir

        Open3.popen3(*cmd, **opts) do |stdin, stdout, stderr, wait_thr|
          stdin_writer = Thread.new do
            stdin.write(stdin_data) if stdin_data
          rescue Errno::EPIPE
            # Child exited/crashed before reading all of stdin -- its non-zero exit status is
            # what reports this as a BridgeError, not this write failure.
          ensure
            stdin.close
          end
          stdout_reader = Thread.new { stdout.read }
          stderr_reader = Thread.new { stderr.read }

          if wait_thr.join(timeout)
            stdin_writer.join
            return [stdout_reader.value, stderr_reader.value, wait_thr.value]
          end

          kill_and_reap(wait_thr)
          [stdin_writer, stdout_reader, stderr_reader].each(&:kill)
          raise BridgeError, "wysiwygConversionCli timed out after #{timeout}s and was killed"
        end
      end

      def kill_and_reap(wait_thr)
        Process.kill("KILL", wait_thr.pid)
      rescue Errno::ESRCH
        # Already exited between the join timeout and the kill attempt -- nothing to do.
      ensure
        wait_thr.join
      end

      def parse_result(stdout, stderr)
        parsed = JSON.parse(stdout)
        unless parsed.is_a?(Hash)
          raise BridgeError, "wysiwygConversionCli stdout was not a JSON object: #{stdout.inspect}"
        end

        failed = parsed["failed"]
        unless [true, false].include?(failed)
          raise BridgeError, "wysiwygConversionCli stdout missing boolean 'failed': #{stdout.inspect}"
        end

        is_draft_js = parsed["isDraftJs"]
        unless [true, false].include?(is_draft_js)
          raise BridgeError, "wysiwygConversionCli stdout missing boolean 'isDraftJs': #{stdout.inspect}"
        end

        if failed
          unless is_draft_js
            raise BridgeError, "wysiwygConversionCli reported failed:true but isDraftJs:false, " \
                               "which the contract forbids: #{stdout.inspect}"
          end

          Result.new(is_draft_js: true, html: nil, failed: true, stderr: stderr.presence)
        else
          html = parsed["html"]
          unless html.is_a?(String)
            raise BridgeError, "wysiwygConversionCli stdout missing string 'html' for a " \
                               "non-failed result: #{stdout.inspect}"
          end

          Result.new(is_draft_js: is_draft_js, html: html, failed: false, stderr: stderr.presence)
        end
      rescue JSON::ParserError => e
        raise BridgeError, "wysiwygConversionCli produced unparseable stdout (#{e.message}): #{stdout.inspect}"
      end
    end
  end
end
