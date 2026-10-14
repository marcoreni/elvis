# frozen_string_literal: true

require "rails_helper"
require "rake"

# Coverage for the Ruby-side behavior of the one-time `elvis:migrate_wysiwyg_content` rake task
# (lib/tasks/elvis.rake): DB lookup/skip/write/idempotency logic and the hard-abort path. The
# Draft.js-to-HTML conversion logic itself (Node, frontend/tools/wysiwygConversion.js) is NOT
# re-tested here -- every example stubs the Ruby bridge (Elvis::WysiwygConverter) so these specs
# are deterministic and don't depend on `node`/`node_modules` being present.
RSpec.describe "elvis:migrate_wysiwyg_content rake task" do
  before(:all) do
    Rails.application.load_tasks unless Rake::Task.task_defined?("elvis:migrate_wysiwyg_content")
  end

  let(:task) { Rake::Task["elvis:migrate_wysiwyg_content"] }

  let(:labels) do
    %w[
      payment_step.display_text
      pricing_info_application.display_text
      availability_info_application.display_text
    ]
  end

  before do
    ENV.delete("DRY_RUN")
    allow(Elvis::WysiwygConverter).to receive(:ensure_available!)
  end

  after do
    task.reenable
    ENV.delete("DRY_RUN")
  end

  def run_task
    capture_stdout { task.invoke }
  end

  def draft_result(html, is_draft_js: true, failed: false)
    Elvis::WysiwygConverter::Result.new(is_draft_js: is_draft_js, html: html, failed: failed)
  end

  def failed_result
    Elvis::WysiwygConverter::Result.new(is_draft_js: true, html: nil, failed: true)
  end

  describe "a label with no matching Parameter row" do
    it "skips it, logs clearly, and creates nothing" do
      expect(Elvis::WysiwygConverter).not_to receive(:convert)

      output = run_task

      labels.each do |label|
        expect(output).to include("#{label}: no row for this label, skipping")
        expect(Parameter.find_by(label: label)).to be_nil
      end
    end
  end

  describe "a blank value" do
    it "skips without invoking the bridge, for both nil and empty string" do
      Parameter.create!(label: labels[0], value: nil, value_type: "string")
      Parameter.create!(label: labels[1], value: "", value_type: "string")

      expect(Elvis::WysiwygConverter).not_to receive(:convert)

      output = run_task

      expect(output).to include("#{labels[0]}: value is blank, skipping")
      expect(output).to include("#{labels[1]}: value is blank, skipping")
    end
  end

  describe "a value that is not Draft.js JSON" do
    it "skips as a no-op and leaves the row untouched" do
      html = "<p>Already migrated <em>HTML</em> content.</p>"
      parameter = Parameter.create!(label: labels[0], value: html, value_type: "string")
      allow(Elvis::WysiwygConverter).to receive(:convert).with(html).and_return(draft_result(html, is_draft_js: false))

      output = run_task

      expect(output).to include("#{labels[0]}: already HTML/plain, skipping")
      expect(parameter.reload.value).to eq(html)
    end
  end

  describe "a value that is Draft.js JSON and converts successfully" do
    it "writes the converted HTML back and logs the label plus old/new length" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      converted_html = "<p>hi</p>"
      parameter = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")
      allow(Elvis::WysiwygConverter).to receive(:convert).with(draft_json).and_return(draft_result(converted_html))

      output = run_task

      expect(parameter.reload.value).to eq(converted_html)
      expect(parameter.value_type).to eq("string")
      expect(output).to include("#{labels[0]}: converted Draft.js JSON to HTML")
      expect(output).to include("#{draft_json.length} -> #{converted_html.length}")
    end
  end

  describe "a value that is Draft.js JSON but genuinely fails to convert" do
    it "does not write anything and logs a loud warning naming the label" do
      bad_json = '{"blocks":[{"key":"b1","inlineStyleRanges":"not-an-array"}],"entityMap":{}}'
      parameter = Parameter.create!(label: labels[0], value: bad_json, value_type: "string")
      allow(Elvis::WysiwygConverter).to receive(:convert).with(bad_json).and_return(failed_result)

      output = run_task

      expect(parameter.reload.value).to eq(bad_json)
      expect(output).to include("ERROR")
      expect(output).to include("#{labels[0]}: Draft.js content FAILED to convert")
    end
  end

  describe "dry-run mode" do
    it "performs zero DB writes for a row that would otherwise be converted, and marks every line" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      converted_html = "<p>hi</p>"
      parameter = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")
      allow(Elvis::WysiwygConverter).to receive(:convert).with(draft_json).and_return(draft_result(converted_html))

      ENV["DRY_RUN"] = "1"
      output = run_task

      expect(parameter.reload.value).to eq(draft_json)
      expect(output.lines).to all(start_with("[DRY RUN] "))
      expect(output).to include("would convert Draft.js JSON to HTML")
    end

    it "performs zero DB writes across every other path too (missing row, blank, already-HTML, failure)" do
      html = "<p>already html</p>"
      bad_json = '{"blocks":[{"key":"b1","inlineStyleRanges":"not-an-array"}],"entityMap":{}}'
      Parameter.create!(label: labels[0], value: html, value_type: "string")
      blank_param = Parameter.create!(label: labels[1], value: "", value_type: "string")
      failing_param = Parameter.create!(label: labels[2], value: bad_json, value_type: "string")

      allow(Elvis::WysiwygConverter).to receive(:convert).with(html).and_return(draft_result(html, is_draft_js: false))
      allow(Elvis::WysiwygConverter).to receive(:convert).with(bad_json).and_return(failed_result)

      ENV["DRY_RUN"] = "1"
      expect { run_task }.not_to(change { Parameter.pluck(:id, :value).sort })

      expect(blank_param.reload.value).to eq("")
      expect(failing_param.reload.value).to eq(bad_json)
    end
  end

  describe "idempotency" do
    it "converts on the first real run, then skips on a second run with zero further changes" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      converted_html = "<p>hi</p>"
      parameter = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")

      # Faithful-to-contract stub: Draft.js JSON converts; anything else reports isDraftJs:false
      # and echoes its input back unchanged, exactly like the real CLI bridge would.
      allow(Elvis::WysiwygConverter).to receive(:convert) do |value|
        value == draft_json ? draft_result(converted_html) : draft_result(value, is_draft_js: false)
      end

      first_output = run_task
      expect(parameter.reload.value).to eq(converted_html)
      expect(first_output).to include("#{labels[0]}: converted Draft.js JSON to HTML")

      task.reenable

      second_output = nil
      expect { second_output = run_task }.not_to(change { parameter.reload.value })
      expect(second_output).to include("#{labels[0]}: already HTML/plain, skipping")
    end
  end

  describe "the hard-abort path" do
    it "aborts loudly when the bridge itself is unavailable, before processing any label" do
      allow(Elvis::WysiwygConverter).to receive(:ensure_available!)
        .and_raise(Elvis::WysiwygConverter::BridgeError, "node executable not found")
      expect(Elvis::WysiwygConverter).not_to receive(:convert)

      expect { task.invoke }.to raise_error(SystemExit)
    end

    it "aborts loudly when the bridge returns a non-zero exit or unparseable stdout for a row" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      Parameter.create!(label: labels[0], value: draft_json, value_type: "string")
      allow(Elvis::WysiwygConverter).to receive(:convert).with(draft_json)
                                                         .and_raise(Elvis::WysiwygConverter::BridgeError,
                                                                    "wysiwygConversionCli exited with status 1")

      expect { task.invoke }.to raise_error(SystemExit)
    end
  end
end
