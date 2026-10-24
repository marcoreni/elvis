# frozen_string_literal: true

require "rails_helper"
require "rake"

# Coverage for the Ruby-side behavior of the `elvis:migrate_wysiwyg_content` rake task
# (lib/tasks/elvis.rake): DB lookup/skip/write/idempotency logic. The Draft.js-to-HTML conversion
# logic itself has its own direct coverage in spec/lib/elvis/wysiwyg_converter_spec.rb -- every
# example here stubs Elvis::WysiwygConverter so these specs stay focused on the migrator's own
# DB/logging behavior.
#
# This task is a permanent safety net (not a one-time migration), so idempotency -- a second run
# after everything converted being a clean no-op -- is the most important property it has.
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

  before { ENV.delete("DRY_RUN") }

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

  def failed_result(error_message: nil)
    Elvis::WysiwygConverter::Result.new(is_draft_js: true, html: nil, failed: true, error_message: error_message)
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
    it "skips without invoking the converter, for both nil and empty string" do
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
      converted_html = "<p>hi</p>\n"
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

    it "surfaces the converter's error_message on the console, not just in Rails.logger" do
      bad_json = '{"blocks":[{"key":"b1","inlineStyleRanges":"not-an-array"}],"entityMap":{}}'
      parameter = Parameter.create!(label: labels[0], value: bad_json, value_type: "string")
      error_message = "TypeError: Cannot read properties of undefined"
      allow(Elvis::WysiwygConverter).to receive(:convert)
        .with(bad_json).and_return(failed_result(error_message: error_message))

      output = run_task

      expect(parameter.reload.value).to eq(bad_json)
      expect(output).to include(error_message)
    end

    it "truncates a very long error_message instead of dumping it wholesale to the console" do
      bad_json = '{"blocks":[{"key":"b1"}],"entityMap":{}}'
      Parameter.create!(label: labels[0], value: bad_json, value_type: "string")
      long_message = "x" * 5000
      allow(Elvis::WysiwygConverter).to receive(:convert)
        .with(bad_json).and_return(failed_result(error_message: long_message))

      output = run_task

      expect(output).to include("truncated")
      expect(output).not_to include(long_message)
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
      converted_html = "<p>hi</p>\n"
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
      converted_html = "<p>hi</p>\n"
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
      converted_html = "<p>hi</p>\n"
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

    it "catches a Draft.js-shaped row with a NULL label (NOT IN excludes NULL, so this is the " \
       "exact gap the scan exists to catch)" do
      rogue = Parameter.create!(label: nil, value: '{"blocks":[{"key":"z"}],"entityMap":{}}', value_type: "string")

      output = run_task

      expect(output).to include("UNEXPECTED possible Draft.js content")
      expect(output).to include("id=#{rogue.id}")
      expect(output).to include("label=nil")
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
      allow(Elvis::WysiwygConverter).to receive(:convert).with(draft_json).and_return(draft_result("<p>hi</p>\n"))
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

    %w[0 false FALSE no NO off OFF].each do |falsy_value|
      it "treats DRY_RUN=#{falsy_value.inspect} as disabled (performs a real write)" do
        parameter, _draft_json = create_convertible_row
        ENV["DRY_RUN"] = falsy_value

        output = run_task

        expect(parameter.reload.value).to eq("<p>hi</p>\n")
        expect(output).not_to include("[DRY RUN]")
      end
    end

    # A present-but-blank value (a quoting slip, e.g. DRY_RUN=" ") is NOT the same as a
    # genuinely unset DRY_RUN -- it must keep the documented preview-biased default rather than
    # falling through to a real write. Only ENV["DRY_RUN"] being literally unset (nil) disables
    # dry-run.
    ["", " ", "\t", "  \n  "].each do |blank_value|
      it "treats DRY_RUN=#{blank_value.inspect} (present but blank) as dry-run, not as disabled" do
        parameter, draft_json = create_convertible_row
        ENV["DRY_RUN"] = blank_value

        output = run_task

        expect(parameter.reload.value).to eq(draft_json)
        expect(output.lines).to all(start_with("[DRY RUN] "))
      end
    end

    it "treats a genuinely unset DRY_RUN (nil) as disabled (performs a real write)" do
      parameter, _draft_json = create_convertible_row
      ENV.delete("DRY_RUN")

      output = run_task

      expect(parameter.reload.value).to eq("<p>hi</p>\n")
      expect(output).not_to include("[DRY RUN]")
    end
  end

  describe "dry-run mode" do
    it "performs zero DB writes for a row that would otherwise be converted, and marks every line" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      converted_html = "<p>hi</p>\n"
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

  describe "idempotency (this task is a permanent safety net, run repeatedly)" do
    it "converts on the first real run, then skips on a second run with zero further changes" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi"}],"entityMap":{}}'
      converted_html = "<p>hi</p>\n"
      parameter = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")

      # Faithful-to-contract stub: Draft.js JSON converts; anything else reports isDraftJs:false
      # and echoes its input back unchanged, exactly like the real converter would.
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

    it "is a clean no-op end to end using the real (non-stubbed) converter, across many runs" do
      draft_json = '{"blocks":[{"key":"a1","text":"hi",' \
                   '"inlineStyleRanges":[{"offset":0,"length":2,"style":"BOLD"}]}],"entityMap":{}}'
      parameter = Parameter.create!(label: labels[0], value: draft_json, value_type: "string")

      run_task
      converted = parameter.reload.value
      expect(converted).to eq("<p><strong>hi</strong></p>\n")

      task.reenable
      expect { run_task }.not_to(change { parameter.reload.value })

      task.reenable
      expect { run_task }.not_to(change { parameter.reload.value })
    end
  end
end
