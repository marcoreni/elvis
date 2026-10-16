# frozen_string_literal: true

require "rails_helper"

# Direct coverage for Elvis::WysiwygConverter's own strict stdout-contract validation and its
# node-invocation plumbing (timeout, ENOENT). The rake-task spec
# (spec/lib/migrate_wysiwyg_content_rake_task_spec.rb) stubs this whole class instead, so none
# of this is covered there. Every example here stubs Open3.popen3 directly -- the primitive
# capture3_with_timeout is built on (Open3.capture3 itself has no timeout option) -- so these
# specs are deterministic, exercise the timeout path, and never actually invoke `node`.
RSpec.describe Elvis::WysiwygConverter do
  let(:wait_thr) { double("wait_thr", pid: 4242) }
  let(:stdin) { double("stdin", write: nil, close: nil) }
  let(:stdout_io) { double("stdout_io") }
  let(:stderr_io) { double("stderr_io") }

  def stub_node_call(stdout:, stderr: "", exitstatus: 0)
    status = double("status", success?: exitstatus.zero?, exitstatus: exitstatus)
    allow(wait_thr).to receive(:join).and_return(wait_thr)
    allow(wait_thr).to receive(:value).and_return(status)
    allow(stdout_io).to receive(:read).and_return(stdout)
    allow(stderr_io).to receive(:read).and_return(stderr)

    allow(Open3).to receive(:popen3) do |*_args, **_opts, &block|
      block.call(stdin, stdout_io, stderr_io, wait_thr)
    end
  end

  def stub_node_timeout
    # First #join call (with the timeout) reports "not finished"; the bare #join used to reap
    # the process after it's killed succeeds.
    allow(wait_thr).to receive(:join).and_return(nil, wait_thr)
    allow(stdout_io).to receive(:read).and_return("")
    allow(stderr_io).to receive(:read).and_return("")
    allow(Process).to receive(:kill)

    allow(Open3).to receive(:popen3) do |*_args, **_opts, &block|
      block.call(stdin, stdout_io, stderr_io, wait_thr)
    end
  end

  describe ".convert" do
    it "raises ArgumentError for nil input, without touching the bridge" do
      expect(Open3).not_to receive(:popen3)
      expect { described_class.convert(nil) }.to raise_error(ArgumentError, /must not be blank/)
    end

    it "raises ArgumentError for an empty string, without touching the bridge" do
      expect(Open3).not_to receive(:popen3)
      expect { described_class.convert("") }.to raise_error(ArgumentError, /must not be blank/)
    end

    it "returns a non-failed, non-Draft.js Result for already-HTML content" do
      stub_node_call(stdout: '{"isDraftJs":false,"html":"<p>x</p>","failed":false}')

      result = described_class.convert("<p>x</p>")

      expect(result.is_draft_js).to be(false)
      expect(result.html).to eq("<p>x</p>")
      expect(result.failed).to be(false)
    end

    it "returns a non-failed, Draft.js Result for content that converts successfully" do
      stub_node_call(stdout: '{"isDraftJs":true,"html":"<p>hi</p>","failed":false}')

      result = described_class.convert('{"blocks":[]}')

      expect(result.is_draft_js).to be(true)
      expect(result.html).to eq("<p>hi</p>")
      expect(result.failed).to be(false)
    end

    it "returns a failed Result, carrying stderr, for a genuine conversion failure" do
      stub_node_call(stdout: '{"isDraftJs":true,"failed":true}', stderr: "double conversion failure\n")

      result = described_class.convert('{"blocks":"broken"}')

      expect(result.is_draft_js).to be(true)
      expect(result.html).to be_nil
      expect(result.failed).to be(true)
      expect(result.stderr).to eq("double conversion failure\n")
    end

    it "raises BridgeError for a non-zero exit code" do
      stub_node_call(stdout: "", stderr: "boom", exitstatus: 1)

      expect do
        described_class.convert("<p>x</p>")
      end.to raise_error(described_class::BridgeError, /exited with status 1/)
    end

    it "raises BridgeError for unparseable stdout" do
      stub_node_call(stdout: "not json")

      expect { described_class.convert("<p>x</p>") }.to raise_error(described_class::BridgeError, /unparseable stdout/)
    end

    it "raises BridgeError when stdout JSON is not an object" do
      stub_node_call(stdout: "[1,2,3]")

      expect { described_class.convert("<p>x</p>") }.to raise_error(described_class::BridgeError, /not a JSON object/)
    end

    it "raises BridgeError when 'failed' is missing" do
      stub_node_call(stdout: '{"isDraftJs":false,"html":"<p>x</p>"}')

      expect do
        described_class.convert("<p>x</p>")
      end.to raise_error(described_class::BridgeError, /missing boolean 'failed'/)
    end

    it "raises BridgeError when 'failed' is not a boolean" do
      stub_node_call(stdout: '{"isDraftJs":false,"html":"<p>x</p>","failed":"no"}')

      expect do
        described_class.convert("<p>x</p>")
      end.to raise_error(described_class::BridgeError, /missing boolean 'failed'/)
    end

    it "raises BridgeError when 'isDraftJs' is missing" do
      stub_node_call(stdout: '{"html":"<p>x</p>","failed":false}')

      expect do
        described_class.convert("<p>x</p>")
      end.to raise_error(described_class::BridgeError, /missing boolean 'isDraftJs'/)
    end

    it "raises BridgeError when 'isDraftJs' is not a boolean" do
      stub_node_call(stdout: '{"isDraftJs":"yes","html":"<p>x</p>","failed":false}')

      expect do
        described_class.convert("<p>x</p>")
      end.to raise_error(described_class::BridgeError, /missing boolean 'isDraftJs'/)
    end

    it "raises BridgeError for the contract-forbidden failed:true + isDraftJs:false combination" do
      stub_node_call(stdout: '{"isDraftJs":false,"failed":true}')

      expect { described_class.convert("<p>x</p>") }.to raise_error(described_class::BridgeError, /contract forbids/)
    end

    it "raises BridgeError when 'html' is missing on a non-failed result" do
      stub_node_call(stdout: '{"isDraftJs":false,"failed":false}')

      expect do
        described_class.convert("<p>x</p>")
      end.to raise_error(described_class::BridgeError, /missing string 'html'/)
    end

    it "raises BridgeError when 'html' is not a String on a non-failed result" do
      stub_node_call(stdout: '{"isDraftJs":false,"html":123,"failed":false}')

      expect do
        described_class.convert("<p>x</p>")
      end.to raise_error(described_class::BridgeError, /missing string 'html'/)
    end

    it "raises BridgeError when node itself is not found" do
      allow(Open3).to receive(:popen3).and_raise(Errno::ENOENT, "No such file or directory - node")

      expect do
        described_class.convert("<p>x</p>")
      end.to raise_error(described_class::BridgeError, /failed to invoke node/)
    end

    it "kills and reaps a wedged child and raises BridgeError instead of hanging forever" do
      stub_node_timeout

      expect { described_class.convert("<p>x</p>") }.to raise_error(described_class::BridgeError, /timed out/)
      expect(Process).to have_received(:kill).with("KILL", wait_thr.pid)
    end
  end

  describe ".ensure_available!" do
    it "does not raise when the script exists and the canary round-trips per contract" do
      stub_node_call(stdout: '{"isDraftJs":false,"html":"<p>x</p>","failed":false}')

      expect { described_class.ensure_available! }.not_to raise_error
    end

    it "raises BridgeError when the script file is missing" do
      allow(File).to receive(:exist?).and_wrap_original do |original, path|
        path.to_s.end_with?("wysiwygConversionCli.js") ? false : original.call(path)
      end

      expect { described_class.ensure_available! }.to raise_error(described_class::BridgeError, /script not found/)
    end

    it "raises BridgeError when the canary does not round-trip per contract" do
      stub_node_call(stdout: '{"isDraftJs":true,"html":"<p>x</p>","failed":false}')

      expect { described_class.ensure_available! }.to raise_error(described_class::BridgeError, /canary check failed/)
    end
  end
end
