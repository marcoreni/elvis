# frozen_string_literal: true

require "rails_helper"

# Coverage for the pure-Ruby Elvis::WysiwygConverter.
#
# The golden-fixture section below (from "Golden fixtures" to "Graceful degradation") uses
# `expected_html` strings that were NOT hand-written: they were captured by running the real
# `draftjs-to-html@0.9.1` (with `draft-js@0.11.7`'s convertFromRaw/convertToRaw normalization
# fallback, matching the now-deleted frontend/tools/wysiwygConversion.js's `convertWysiwyg`) against
# each `raw` input, in a disposable scratch Node project (not part of this repo, discarded after
# each capture). Treat those strings as ground truth for draftjs-to-html's exact output shape, not
# as arbitrary expectations. The "Graceful degradation" examples further down are a DELIBERATE
# exception to that -- see the comment on that section for what the real library actually does
# there and why this port diverges on purpose.
RSpec.describe Elvis::WysiwygConverter do
  def raw(blocks:, entity_map: {})
    { "blocks" => blocks, "entityMap" => entity_map }.to_json
  end

  def block(key:, text:, type: "unstyled", depth: 0, inline_style_ranges: [], entity_ranges: [])
    {
      "key" => key, "text" => text, "type" => type, "depth" => depth,
      "inlineStyleRanges" => inline_style_ranges, "entityRanges" => entity_ranges, "data" => {}
    }
  end

  describe ".looks_like_draft_js_raw?" do
    it "is true for a Draft.js raw-content object (has an Array `blocks` key)" do
      expect(described_class.looks_like_draft_js_raw?(raw(blocks: []))).to be(true)
    end

    it "is false for plain HTML" do
      expect(described_class.looks_like_draft_js_raw?("<p>hello</p>")).to be(false)
    end

    it "is false for JSON that isn't Draft.js-shaped (no Array `blocks`)" do
      expect(described_class.looks_like_draft_js_raw?('{"foo":"bar"}')).to be(false)
      expect(described_class.looks_like_draft_js_raw?('{"blocks":"not-an-array"}')).to be(false)
    end

    it "is false for other valid-JSON-but-not-an-object values (a bare string/number)" do
      expect(described_class.looks_like_draft_js_raw?('"just a string"')).to be(false)
      expect(described_class.looks_like_draft_js_raw?("42")).to be(false)
    end

    it "is false for nil/blank" do
      expect(described_class.looks_like_draft_js_raw?(nil)).to be(false)
      expect(described_class.looks_like_draft_js_raw?("")).to be(false)
    end
  end

  describe ".convert" do
    it "raises ArgumentError for nil input" do
      expect { described_class.convert(nil) }.to raise_error(ArgumentError, /must not be blank/)
    end

    it "raises ArgumentError for an empty string" do
      expect { described_class.convert("") }.to raise_error(ArgumentError, /must not be blank/)
    end

    it "returns a non-failed, non-Draft.js Result echoing already-HTML content back as-is" do
      html = "<p>Already migrated <em>HTML</em>.</p>"
      result = described_class.convert(html)

      expect(result.is_draft_js).to be(false)
      expect(result.html).to eq(html)
      expect(result.failed).to be(false)
    end

    it "returns a non-failed Result for plain text (also not Draft.js JSON)" do
      result = described_class.convert("just plain text, not even HTML")

      expect(result.is_draft_js).to be(false)
      expect(result.html).to eq("just plain text, not even HTML")
    end

    it "returns a failed Result, carrying an error_message, when the raw JSON is Draft.js-shaped " \
       "but genuinely malformed (a block field with the wrong type)" do
      bad = '{"blocks":[{"key":"b1","text":"hi","inlineStyleRanges":"not-an-array","entityRanges":[]}],"entityMap":{}}'

      result = described_class.convert(bad)

      expect(result.is_draft_js).to be(true)
      expect(result.html).to be_nil
      expect(result.failed).to be(true)
      expect(result.error_message).to be_present
    end

    # --- Golden fixtures, captured from real draftjs-to-html@0.9.1 / draft-js@0.11.7 output ---

    it "renders BOLD alone as <strong>" do
      input = raw(blocks: [block(key: "a1", text: "Hello",
                                 inline_style_ranges: [{ "offset" => 0, "length" => 5, "style" => "BOLD" }])])
      expect(described_class.convert(input).html).to eq("<p><strong>Hello</strong></p>\n")
    end

    it "renders ITALIC alone as <em>" do
      input = raw(blocks: [block(key: "a2", text: "Hello",
                                 inline_style_ranges: [{ "offset" => 0, "length" => 5, "style" => "ITALIC" }])])
      expect(described_class.convert(input).html).to eq("<p><em>Hello</em></p>\n")
    end

    it "renders UNDERLINE alone as <ins>, NOT <u> (the TipTapEditor compatibility quirk)" do
      input = raw(blocks: [block(key: "a3", text: "Hello",
                                 inline_style_ranges: [{ "offset" => 0, "length" => 5, "style" => "UNDERLINE" }])])
      expect(described_class.convert(input).html).to eq("<p><ins>Hello</ins></p>\n")
    end

    it "renders STRIKETHROUGH alone as <del>" do
      input = raw(blocks: [block(key: "a4", text: "Hello",
                                 inline_style_ranges: [{ "offset" => 0, "length" => 5, "style" => "STRIKETHROUGH" }])])
      expect(described_class.convert(input).html).to eq("<p><del>Hello</del></p>\n")
    end

    it "nests overlapping BOLD+ITALIC+UNDERLINE in draftjs-to-html's fixed order regardless of " \
       "the order the ranges were given in" do
      input = raw(blocks: [block(key: "b1", text: "Hello", inline_style_ranges: [
                                   { "offset" => 0, "length" => 5, "style" => "BOLD" },
                                   { "offset" => 0, "length" => 5, "style" => "ITALIC" },
                                   { "offset" => 0, "length" => 5, "style" => "UNDERLINE" }
                                 ])])
      expect(described_class.convert(input).html).to eq("<p><strong><em><ins>Hello</ins></em></strong></p>\n")
    end

    it "nests all 4 overlapping styles outer-to-inner as STRIKETHROUGH > BOLD > ITALIC > UNDERLINE, " \
       "even when the ranges are given in a different order" do
      input = raw(blocks: [block(key: "x1", text: "Hello", inline_style_ranges: [
                                   { "offset" => 0, "length" => 5, "style" => "UNDERLINE" },
                                   { "offset" => 0, "length" => 5, "style" => "STRIKETHROUGH" },
                                   { "offset" => 0, "length" => 5, "style" => "BOLD" },
                                   { "offset" => 0, "length" => 5, "style" => "ITALIC" }
                                 ])])
      expect(described_class.convert(input).html).to eq(
        "<p><del><strong><em><ins>Hello</ins></em></strong></del></p>\n"
      )
    end

    it "applies a style to only part of a block's text (partial range)" do
      input = raw(blocks: [block(key: "c1", text: "Hello world",
                                 inline_style_ranges: [{ "offset" => 0, "length" => 5, "style" => "BOLD" }])])
      expect(described_class.convert(input).html).to eq("<p><strong>Hello</strong> world</p>\n")
    end

    {
      "unstyled" => "<p>Some text</p>\n",
      "header-one" => "<h1>Some text</h1>\n",
      "header-two" => "<h2>Some text</h2>\n",
      "header-three" => "<h3>Some text</h3>\n",
      "header-four" => "<h4>Some text</h4>\n",
      "header-five" => "<h5>Some text</h5>\n",
      "header-six" => "<h6>Some text</h6>\n",
      "blockquote" => "<blockquote>Some text</blockquote>\n"
    }.each do |type, expected_html|
      it "renders block type #{type.inspect} as #{expected_html.inspect}" do
        input = raw(blocks: [block(key: "d", text: "Some text", type: type)])
        expect(described_class.convert(input).html).to eq(expected_html)
      end
    end

    it "wraps a single unordered-list-item block in <ul><li>" do
      input = raw(blocks: [block(key: "e1", text: "Item one", type: "unordered-list-item")])
      expect(described_class.convert(input).html).to eq("<ul>\n<li>Item one</li>\n</ul>\n")
    end

    it "wraps a single ordered-list-item block in <ol><li>" do
      input = raw(blocks: [block(key: "e2", text: "Item one", type: "ordered-list-item")])
      expect(described_class.convert(input).html).to eq("<ol>\n<li>Item one</li>\n</ol>\n")
    end

    it "groups 3 consecutive unordered-list-item blocks into one <ul> with 3 <li>s" do
      input = raw(blocks: [
                    block(key: "f1", text: "First", type: "unordered-list-item"),
                    block(key: "f2", text: "Second", type: "unordered-list-item"),
                    block(key: "f3", text: "Third", type: "unordered-list-item")
                  ])
      expect(described_class.convert(input).html).to eq(
        "<ul>\n<li>First</li>\n<li>Second</li>\n<li>Third</li>\n</ul>\n"
      )
    end

    it "groups 3 consecutive ordered-list-item blocks into one <ol> with 3 <li>s" do
      input = raw(blocks: [
                    block(key: "g1", text: "First", type: "ordered-list-item"),
                    block(key: "g2", text: "Second", type: "ordered-list-item"),
                    block(key: "g3", text: "Third", type: "ordered-list-item")
                  ])
      expect(described_class.convert(input).html).to eq(
        "<ol>\n<li>First</li>\n<li>Second</li>\n<li>Third</li>\n</ol>\n"
      )
    end

    it "splits two unordered-list-item groups into separate <ul>s when a paragraph interrupts them" do
      input = raw(blocks: [
                    block(key: "h1", text: "A", type: "unordered-list-item"),
                    block(key: "h2", text: "B", type: "unordered-list-item"),
                    block(key: "h3", text: "Between"),
                    block(key: "h4", text: "C", type: "unordered-list-item")
                  ])
      expect(described_class.convert(input).html).to eq(
        "<ul>\n<li>A</li>\n<li>B</li>\n</ul>\n<p>Between</p>\n<ul>\n<li>C</li>\n</ul>\n"
      )
    end

    it "switches tag mid-run when unordered/ordered list items are adjacent with no separator block" do
      input = raw(blocks: [
                    block(key: "m1", text: "U1", type: "unordered-list-item"),
                    block(key: "m2", text: "U2", type: "unordered-list-item"),
                    block(key: "m3", text: "O1", type: "ordered-list-item"),
                    block(key: "m4", text: "O2", type: "ordered-list-item")
                  ])
      expect(described_class.convert(input).html).to eq(
        "<ul>\n<li>U1</li>\n<li>U2</li>\n</ul>\n<ol>\n<li>O1</li>\n<li>O2</li>\n</ol>\n"
      )
    end

    it "groups a run of mixed-depth unordered-list-item blocks (indent/outdent) into a nested " \
       "<ul>, recursing one sub-list per depth increase -- both old editor toolbars left " \
       "react-draft-wysiwyg's indent/outdent buttons enabled, so depth > 0 is real, reachable data" do
      input = raw(blocks: [
                    block(key: "n1", text: "Top", type: "unordered-list-item", depth: 0),
                    block(key: "n2", text: "Nested", type: "unordered-list-item", depth: 1),
                    block(key: "n3", text: "Top2", type: "unordered-list-item", depth: 0)
                  ])
      expect(described_class.convert(input).html).to eq(
        "<ul>\n<li>Top</li>\n<ul>\n<li>Nested</li>\n</ul>\n<li>Top2</li>\n</ul>\n"
      )
    end

    it "handles multiple levels of nesting (depth 0/1/2/1/0), recursing one sub-list per level" do
      input = raw(blocks: [
                    block(key: "d0", text: "L0a", type: "unordered-list-item", depth: 0),
                    block(key: "d1", text: "L1a", type: "unordered-list-item", depth: 1),
                    block(key: "d2", text: "L2", type: "unordered-list-item", depth: 2),
                    block(key: "d3", text: "L1b", type: "unordered-list-item", depth: 1),
                    block(key: "d4", text: "L0b", type: "unordered-list-item", depth: 0)
                  ])
      expect(described_class.convert(input).html).to eq(
        "<ul>\n<li>L0a</li>\n<ul>\n<li>L1a</li>\n<ul>\n<li>L2</li>\n</ul>\n<li>L1b</li>\n</ul>\n<li>L0b</li>\n</ul>\n"
      )
    end

    it "sorts entity ranges by offset before building sections, regardless of the order they " \
       "appear in `entityRanges` (both links point correctly even though the 2nd range -- Beta " \
       "-- is listed first in the input)" do
      input = raw(
        blocks: [block(key: "e1", text: "Alpha Beta", entity_ranges: [
                         { "offset" => 6, "length" => 4, "key" => 1 },
                         { "offset" => 0, "length" => 5, "key" => 0 }
                       ])],
        entity_map: {
          "0" => { "type" => "LINK", "data" => { "url" => "https://alpha.example" } },
          "1" => { "type" => "LINK", "data" => { "url" => "https://beta.example" } }
        }
      )
      expect(described_class.convert(input).html).to eq(
        "<p><a href=\"https://alpha.example\" target=\"_self\">Alpha</a> " \
        "<a href=\"https://beta.example\" target=\"_self\">Beta</a></p>\n"
      )
    end

    it "renders a LINK entity as <a href=... target=\"_self\">, defaulting target to _self" do
      input = raw(
        blocks: [block(key: "i1", text: "Click here", entity_ranges: [{ "offset" => 0, "length" => 10, "key" => 0 }])],
        entity_map: { "0" => { "type" => "LINK", "mutability" => "MUTABLE", "data" => { "url" => "https://example.com" } } }
      )
      expect(described_class.convert(input).html).to eq(
        "<p><a href=\"https://example.com\" target=\"_self\">Click here</a></p>\n"
      )
    end

    it "renders inline styles applied partially inside a LINK entity's range, nested inside the <a>" do
      input = raw(
        blocks: [block(
          key: "p1", text: "Click here",
          inline_style_ranges: [{ "offset" => 0, "length" => 5, "style" => "BOLD" }],
          entity_ranges: [{ "offset" => 0, "length" => 10, "key" => 0 }]
        )],
        entity_map: { "0" => { "type" => "LINK", "mutability" => "MUTABLE", "data" => { "url" => "https://example.com" } } }
      )
      expect(described_class.convert(input).html).to eq(
        "<p><a href=\"https://example.com\" target=\"_self\"><strong>Click</strong> here</a></p>\n"
      )
    end

    it "renders a blank block as an empty paragraph" do
      input = raw(blocks: [block(key: "j1", text: "")])
      expect(described_class.convert(input).html).to eq("<p></p>\n")
    end

    it "renders a plain unstyled paragraph with no styles or entities" do
      input = raw(blocks: [block(key: "k1", text: "Just plain text.")])
      expect(described_class.convert(input).html).to eq("<p>Just plain text.</p>\n")
    end

    it "HTML-escapes &, <, > and converts an embedded newline to <br>" do
      input = raw(blocks: [block(key: "n1", text: "A & B <tag>\nnext line")])
      expect(described_class.convert(input).html).to eq("<p>A &amp; B &lt;tag&gt;<br>next line</p>\n")
    end

    it "replaces leading and trailing literal spaces with &nbsp;" do
      input = raw(blocks: [block(key: "o1", text: "  padded  ")])
      expect(described_class.convert(input).html).to eq("<p>&nbsp;&nbsp;padded&nbsp;&nbsp;</p>\n")
    end

    # --- Graceful degradation outside the supported subset ---
    #
    # None of these 3 cases are reachable with this app's actual toolbar config (no "atomic"
    # block type, no IMAGE/MENTION/etc entities, no CODE/SUPERSCRIPT/SUBSCRIPT/color- inline
    # styles were ever offered), so unlike the golden-fixture section above, the expectations
    # here are NOT what the real draftjs-to-html@0.9.1 library does -- this port deliberately
    # diverges, on purpose, rather than replicating real behavior that's unreachable anyway:
    #   - atomic block type: the real library renders NOTHING for the block's text (it expects
    #     an entity to supply the content, e.g. an image) -- this port renders it as a plain
    #     paragraph instead of silently dropping the text.
    #   - IMAGE entity: the real library renders a (broken, since no real `src`/`alt`/dimensions
    #     were supplied) `<img>`/`<div>` -- this port renders the entity's plain text with no
    #     entity markup instead of emitting a broken image tag.
    #   - CODE inline style: the real library wraps it in `<code>` -- this port ignores the style
    #     and renders plain text, since no toolbar in this app ever offered CODE.
    # Each case also logs a warning (surfaced both via Rails.logger and via Result#warnings, so
    # whoever is running the rake task sees it on stdout too) -- if one of these ever fires on
    # real data, that's the signal something assumed-unreachable just became reachable.

    it "degrades an unrecognized block type to a plain paragraph instead of the real library's " \
       "behavior (dropping the text entirely), with a warning on both Rails.logger and Result#warnings" do
      input = raw(blocks: [block(key: "q1", text: "Weird", type: "atomic")])
      expect(Rails.logger).to receive(:warn).with(/unrecognized block type/)
      result = described_class.convert(input)
      expect(result.html).to eq("<p>Weird</p>\n")
      expect(result.warnings).to include(/unrecognized block type/)
    end

    it "degrades an unrecognized entity type by skipping its markup instead of the real " \
       "library's broken <img> output, with a warning on both Rails.logger and Result#warnings" do
      input = raw(
        blocks: [block(key: "r1", text: "An image", entity_ranges: [{ "offset" => 0, "length" => 8, "key" => 0 }])],
        entity_map: { "0" => { "type" => "IMAGE", "data" => { "src" => "x.png" } } }
      )
      expect(Rails.logger).to receive(:warn).with(/unrecognized entity type/)
      result = described_class.convert(input)
      expect(result.html).to eq("<p>An image</p>\n")
      expect(result.warnings).to include(/unrecognized entity type/)
    end

    it "degrades an unrecognized inline style by ignoring it instead of the real library's " \
       "<code> wrapping, with a warning on both Rails.logger and Result#warnings" do
      input = raw(blocks: [block(key: "s1", text: "Hello",
                                 inline_style_ranges: [{ "offset" => 0, "length" => 5, "style" => "CODE" }])])
      expect(Rails.logger).to receive(:warn).with(/unrecognized inline style/)
      result = described_class.convert(input)
      expect(result.html).to eq("<p>Hello</p>\n")
      expect(result.warnings).to include(/unrecognized inline style/)
    end
  end
end
