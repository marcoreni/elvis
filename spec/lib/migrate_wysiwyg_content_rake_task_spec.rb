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

  def failed_result(stderr: nil)
    Elvis::WysiwygConverter::Result.new(is_draft_js: true, html: nil, failed: true, stderr: stderr)
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

    it "surfaces the bridge's stderr on the console, not just in Rails.logger" do
      bad_json = '{"blocks":[{"key":"b1","inlineStyleRanges":"not-an-array"}],"entityMap":{}}'
      parameter = Parameter.create!(label: labels[0], value: bad_json, value_type: "string")
      stderr_message = "TypeError: Cannot read properties of undefined"
      allow(Elvis::WysiwygConverter).to receive(:convert)
        .with(bad_json).and_return(failed_result(stderr: stderr_message))

      output = run_task

      expect(parameter.reload.value).to eq(bad_json)
      expect(output).to include(stderr_message)
    end

    it "truncates a very long stderr instead of dumping it wholesale to the console" do
      bad_json = '{"blocks":[{"key":"b1"}],"entityMap":{}}'
      Parameter.create!(label: labels[0], value: bad_json, value_type: "string")
      long_stderr = "x" * 5000
      allow(Elvis::WysiwygConverter).to receive(:convert).with(bad_json).and_return(failed_result(stderr: long_stderr))

      output = run_task

      expect(output).to include("truncated")
      expect(output).not_to include(long_stderr)
    end
  end

  describe "a parameter whose value_type is not \"string\"" do
    it "skips it with a warning instead of writing HTML into a non-string column" do
      parameter = Parameter.create!(label: labels[0], value: '{"blocks":[]}', value_type: "json")
      expect(Elvis::WysiwygConverter).not_to receive(:convert)

      output = run_task

      expect(output).to include("value_type is \"json\"")
      expect(parameter.reload.value).to eq('{"blocks":[]}')
      expect(parameter.reload.value_type).to eq("json")
    end
  end

  describe "a label with more than one matching Parameter row" do
    it "processes every matching row (not just one), naming each by id in the log" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      converted_html = "<p>hi</p>"
      older = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")
      newer = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")
      allow(Elvis::WysiwygConverter).to receive(:convert).with(draft_json).and_return(draft_result(converted_html))

      output = run_task

      expect(older.reload.value).to eq(converted_html)
      expect(newer.reload.value).to eq(converted_html)
      expect(output).to include("#{labels[0]} (id=#{older.id}): converted Draft.js JSON to HTML")
      expect(output).to include("#{labels[0]} (id=#{newer.id}): converted Draft.js JSON to HTML")
    end
  end

  describe "a concurrent write between the read and the write (lost-update race)" do
    it "skips the write and logs loudly instead of clobbering a concurrent admin save" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      converted_html = "<p>hi</p>"
      concurrent_value = "<p>someone else's concurrent edit</p>"
      parameter = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")

      allow(Elvis::WysiwygConverter).to receive(:convert) do |_value|
        # Simulate an admin saving through the real app between this task's read and its write.
        Parameter.where(id: parameter.id).update_all(value: concurrent_value)
        draft_result(converted_html)
      end

      output = run_task

      expect(parameter.reload.value).to eq(concurrent_value)
      expect(output).to include("ERROR")
      expect(output).to include("#{labels[0]}: value changed since it was read")
    end
  end

  describe "cache invalidation on a successful write" do
    it "expires the parameter_<label> cache key so get_value doesn't serve the stale pre-migration value" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      converted_html = "<p>hi</p>"
      Parameter.create!(label: labels[0], value: draft_json, value_type: "string")
      Parameter.get_value(labels[0]) # warm the cache with the pre-migration Draft.js JSON
      allow(Elvis::WysiwygConverter).to receive(:convert).with(draft_json).and_return(draft_result(converted_html))

      run_task

      expect(Parameter.get_value(labels[0])).to eq(converted_html)
    end
  end

  describe "the end-of-run safety scan for Draft.js content outside the known labels" do
    it "logs a loud warning naming any unexpected Draft.js-shaped row" do
      rogue = Parameter.create!(label: "some_plugin.weird_field",
                                value: '{"blocks":[{"key":"z"}],"entityMap":{}}', value_type: "string")

      output = run_task

      expect(output).to include("UNEXPECTED possible Draft.js content")
      expect(output).to include("id=#{rogue.id}")
      expect(output).to include(rogue.label)
    end

    it "logs a clean result when nothing unexpected is found" do
      output = run_task

      expect(output).to include("safety scan: no Draft.js-shaped content found")
    end

    it "runs (and logs) during dry-run too, without writing anything" do
      rogue = Parameter.create!(label: "some_plugin.weird_field",
                                value: '{"blocks":[{"key":"z"}],"entityMap":{}}', value_type: "string")

      ENV["DRY_RUN"] = "1"
      output = run_task

      expect(output).to include("UNEXPECTED possible Draft.js content")
      expect(rogue.reload.value).to eq('{"blocks":[{"key":"z"}],"entityMap":{}}')
    end
  end

  describe "DRY_RUN truthiness" do
    def create_convertible_row
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      parameter = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")
      allow(Elvis::WysiwygConverter).to receive(:convert).with(draft_json).and_return(draft_result("<p>hi</p>"))
      [parameter, draft_json]
    end

    %w[1 true TRUE yes YES on anything-non-empty].each do |truthy_value|
      it "treats DRY_RUN=#{truthy_value.inspect} as dry-run (previews, writes nothing)" do
        parameter, draft_json = create_convertible_row
        ENV["DRY_RUN"] = truthy_value

        output = run_task

        expect(parameter.reload.value).to eq(draft_json)
        expect(output.lines).to all(start_with("[DRY RUN] "))
      end
    end

    (%w[0 false FALSE no NO off OFF] + [""]).each do |falsy_value|
      it "treats DRY_RUN=#{falsy_value.inspect} as disabled (performs a real write)" do
        parameter, _draft_json = create_convertible_row
        ENV["DRY_RUN"] = falsy_value

        output = run_task

        expect(parameter.reload.value).to eq("<p>hi</p>")
        expect(output).not_to include("[DRY RUN]")
      end
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
