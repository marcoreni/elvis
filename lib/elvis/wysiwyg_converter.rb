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
    # exit code, or stdout that doesn't match one of the contract's 3 known shapes. Never
    # raised for "this one row's content failed to convert" -- that's Result#failed, a
    # legitimate exit-0 verdict.
    class BridgeError < StandardError; end

    Result = Struct.new(:is_draft_js, :html, :failed, keyword_init: true)

    CLI_SCRIPT_RELATIVE_PATH = File.join("frontend", "tools", "wysiwygConversionCli.js")

    class << self
      # Fails loudly and early (call once, before looping over rows) if the bridge can't
      # possibly run, rather than discovering that per-row.
      # @raise [BridgeError]
      def ensure_available!
        script_path = cli_script_path
        raise BridgeError, "wysiwygConversionCli script not found at #{script_path}" unless File.exist?(script_path)

        _stdout, stderr, status = Open3.capture3("node", "--version")
        raise BridgeError, "`node` is not available: #{stderr.strip}" unless status.success?
      rescue Errno::ENOENT => e
        raise BridgeError, "`node` executable not found: #{e.message}"
      end

      # @param raw_value [String] the Parameter row's raw `value`. Must not be blank/nil --
      #   callers must skip blank values without invoking the bridge (per the seam contract).
      # @return [Result]
      # @raise [BridgeError] if the bridge itself is broken.
      def convert(raw_value)
        raise ArgumentError, "raw_value must not be blank" if raw_value.nil? || raw_value.empty?

        stdout, stderr, status =
          begin
            Open3.capture3("node", cli_script_path, stdin_data: raw_value, chdir: Rails.root.to_s)
          rescue Errno::ENOENT => e
            raise BridgeError, "failed to invoke node: #{e.message}"
          end

        unless status.success?
          detail = stderr.present? ? " (stderr: #{stderr.strip})" : ""
          raise BridgeError, "wysiwygConversionCli exited with status #{status.exitstatus}#{detail}"
        end

        Rails.logger.warn("[Elvis::WysiwygConverter] wysiwygConversionCli stderr: #{stderr.strip}") if stderr.present?

        parse_result(stdout)
      end

      private

      def cli_script_path
        Rails.root.join(CLI_SCRIPT_RELATIVE_PATH).to_s
      end

      def parse_result(stdout)
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

          Result.new(is_draft_js: true, html: nil, failed: true)
        else
          html = parsed["html"]
          unless html.is_a?(String)
            raise BridgeError, "wysiwygConversionCli stdout missing string 'html' for a " \
                               "non-failed result: #{stdout.inspect}"
          end

          Result.new(is_draft_js: is_draft_js, html: html, failed: false)
        end
      rescue JSON::ParserError => e
        raise BridgeError, "wysiwygConversionCli produced unparseable stdout (#{e.message}): #{stdout.inspect}"
      end
    end
  end
end
