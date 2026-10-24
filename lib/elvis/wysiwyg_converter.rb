# frozen_string_literal: true

require "json"

module Elvis
  # Pure-Ruby Draft.js-raw-JSON -> HTML converter, restricted to the subset of Draft.js that this
  # app's (now removed) WYSIWYG toolbars ever produced: inline styles BOLD/ITALIC/UNDERLINE/
  # STRIKETHROUGH, block types unstyled/header-one..six/blockquote/unordered-list-item/
  # ordered-list-item (including indented/nested list items -- both old toolbars left
  # react-draft-wysiwyg's indent/outdent buttons enabled), and LINK entities only. No Node/npm
  # dependency -- this replaces the old Node-bridge version (which shelled out to
  # draftjs-to-html/draft-js) now that those packages are gone; see docs/OrphanedCode.md.
  #
  # The exact markup shape (tag names, nesting order for overlapping inline styles, `<ins>` for
  # UNDERLINE, list grouping/nesting, leading/trailing-space -> &nbsp;, entity `target` default)
  # was ported from reading draftjs-to-html@0.9.1's source and cross-checked against real output
  # from draft-js@0.11.7 + draftjs-to-html@0.9.1 in a disposable scratch project (see
  # spec/lib/elvis/wysiwyg_converter_spec.rb for the captured golden fixtures and provenance
  # comment). Anything outside the supported subset degrades gracefully (unrecognized block type
  # -> plain paragraph, unrecognized entity type -> text without entity markup, unrecognized
  # inline style -> ignored) rather than raising -- real data should never hit those paths, but if
  # it ever does, `Result#warnings` surfaces it to whoever is watching the rake task's own stdout,
  # not just `Rails.logger`.
  class WysiwygConverter
    Result = Struct.new(:is_draft_js, :html, :failed, :error_message, :warnings, keyword_init: true)

    BLOCK_TAGS = {
      "unstyled" => "p",
      "header-one" => "h1",
      "header-two" => "h2",
      "header-three" => "h3",
      "header-four" => "h4",
      "header-five" => "h5",
      "header-six" => "h6",
      "blockquote" => "blockquote"
    }.freeze

    LIST_BLOCK_TAGS = {
      "unordered-list-item" => "ul",
      "ordered-list-item" => "ol"
    }.freeze

    INLINE_STYLE_TAGS = {
      "BOLD" => "strong",
      "ITALIC" => "em",
      "UNDERLINE" => "ins", # deliberate: draftjs-to-html serializes UNDERLINE as <ins>, not <u> --
      # see frontend/components/common/TipTapEditor.tsx's InsCompatibleUnderline, which exists to
      # keep reading that already-migrated markup. Must stay <ins> for byte-compatibility.
      "STRIKETHROUGH" => "del"
    }.freeze

    # draftjs-to-html wraps overlapping inline styles in this fixed order regardless of the order
    # they appear in `inlineStyleRanges` -- first entry becomes the innermost tag.
    INLINE_STYLE_NEST_ORDER = %w[UNDERLINE ITALIC BOLD STRIKETHROUGH].freeze

    class << self
      # @param value [String, nil]
      # @return [Boolean] does `value` parse as Draft.js raw-content JSON (an object with an
      #   Array `blocks` key)?
      def looks_like_draft_js_raw?(value)
        !try_parse_draft_raw(value).nil?
      end

      # @param raw_value [String] the Parameter row's raw `value`. Must not be blank/nil --
      #   callers must skip blank values themselves (matching the old bridge's contract).
      # @return [Result] `warnings` is always an Array (possibly empty) of messages for any
      #   graceful-degradation path hit during rendering -- already logged to Rails.logger by the
      #   time this returns, but also handed back so a caller with its own stdout-visible logger
      #   (the migrator/rake task) can surface them there too.
      def convert(raw_value)
        raise ArgumentError, "raw_value must not be blank" if raw_value.nil? || raw_value.empty?

        parsed = try_parse_draft_raw(raw_value)
        return Result.new(is_draft_js: false, html: raw_value, failed: false, warnings: []) if parsed.nil?

        warnings = []

        begin
          html = render(parsed, warnings)
          warnings.each { |w| Rails.logger.warn("[Elvis::WysiwygConverter] #{w}") }
          Result.new(is_draft_js: true, html: html, failed: false, warnings: warnings)
        rescue StandardError => e
          Rails.logger.error("[Elvis::WysiwygConverter] failed to convert Draft.js content: #{e.class}: #{e.message}")
          Result.new(is_draft_js: true, html: nil, failed: true, error_message: "#{e.class}: #{e.message}",
                     warnings: warnings)
        end
      end

      private

      def try_parse_draft_raw(value)
        return nil if value.nil? || value.empty?

        parsed = JSON.parse(value)
        return nil unless parsed.is_a?(Hash) && parsed["blocks"].is_a?(Array)

        parsed
      rescue JSON::ParserError
        nil
      end

      def render(parsed, warnings)
        blocks = parsed["blocks"] || []
        entity_map = parsed["entityMap"] || {}
        html = +""
        pending_list = []

        blocks.each do |block|
          if LIST_BLOCK_TAGS.key?(block["type"])
            pending_list << block
            next
          end

          unless pending_list.empty?
            html << list_markup(pending_list, entity_map, warnings)
            pending_list = []
          end
          html << block_markup(block, entity_map, warnings)
        end

        html << list_markup(pending_list, entity_map, warnings) unless pending_list.empty?
        html
      end

      def block_markup(block, entity_map, warnings)
        type = block["type"]
        tag = BLOCK_TAGS[type]
        if tag.nil?
          warnings << "unrecognized block type #{type.inspect}; rendering as a plain paragraph"
          tag = "p"
        end

        "<#{tag}>#{block_inner_markup(block, entity_map, warnings)}</#{tag}>\n"
      end

      # Groups a run of consecutive list-type blocks (no non-list block between them) into
      # <ul>/<ol>, recursing into a sub-list for any run of deeper `depth` blocks (indent/outdent)
      # and switching tag whenever the item type changes -- a straight port of draftjs-to-html's
      # getListMarkup, including its nesting algorithm.
      def list_markup(list_blocks, entity_map, warnings)
        html = +""
        nested_list_block = []
        previous_block = nil

        list_blocks.each do |block|
          nested_block = false
          type = block["type"]

          if previous_block.nil?
            html << "<#{LIST_BLOCK_TAGS.fetch(type, 'ul')}>\n"
          elsif previous_block["type"] != type
            html << "</#{LIST_BLOCK_TAGS.fetch(previous_block['type'], 'ul')}>\n"
            html << "<#{LIST_BLOCK_TAGS.fetch(type, 'ul')}>\n"
          elsif (previous_block["depth"] || 0) == (block["depth"] || 0)
            unless nested_list_block.empty?
              html << list_markup(nested_list_block, entity_map, warnings)
              nested_list_block = []
            end
          else
            nested_block = true
            nested_list_block << block
          end

          next if nested_block

          html << "<li>#{block_inner_markup(block, entity_map, warnings)}</li>\n"
          previous_block = block
        end

        html << list_markup(nested_list_block, entity_map, warnings) unless nested_list_block.empty?
        html << "</#{LIST_BLOCK_TAGS.fetch(previous_block['type'], 'ul')}>\n"
        html
      end

      def block_inner_markup(block, entity_map, warnings)
        chars = (block["text"] || "").chars
        style_array = style_array_for_block(block, chars, warnings)
        sections = sections_for_block(block, chars.length)

        sections.each_with_index.map do |section, index|
          text = section_markup(section, chars, style_array, entity_map, warnings)
          text = trim_leading_nbsp(text) if index.zero?
          text = trim_trailing_nbsp(text) if index == sections.length - 1
          text
        end.join
      end

      # Per-character map of which of our 4 supported inline styles apply at each offset.
      # Anything outside BOLD/ITALIC/UNDERLINE/STRIKETHROUGH (color-/bgcolor-/fontsize-/
      # fontfamily- ranges, or any other unrecognized style) is dropped, with a warning --
      # this app's toolbars never produced them.
      def style_array_for_block(block, chars, warnings)
        styles = INLINE_STYLE_TAGS.keys.index_with { Array.new(chars.length, false) }

        (block["inlineStyleRanges"] || []).each do |range|
          style = range["style"]
          unless styles.key?(style)
            warnings << "unrecognized inline style #{style.inspect}; ignoring"
            next
          end

          offset = range["offset"] || 0
          length = range["length"] || 0
          (offset...(offset + length)).each do |i|
            styles[style][i] = true if i >= 0 && i < chars.length
          end
        end

        styles
      end

      # Splits a block into entity/plain-text sections, mirroring draftjs-to-html's getSections
      # (hashtag support omitted -- unreachable, this app never enabled it).
      def sections_for_block(block, text_length)
        ranges = (block["entityRanges"] || [])
                 .map { |r| { offset: r["offset"], length: r["length"], key: r["key"] } }
                 .sort_by { |r| r[:offset] }

        sections = []
        last_offset = 0

        ranges.each do |r|
          sections << { start: last_offset, end: r[:offset] } if r[:offset] > last_offset
          sections << { start: r[:offset], end: r[:offset] + r[:length], entity_key: r[:key], type: "ENTITY" }
          last_offset = r[:offset] + r[:length]
        end
        sections << { start: last_offset, end: text_length } if last_offset < text_length

        sections
      end

      def section_markup(section, chars, style_array, entity_map, warnings)
        inner = inline_style_sections(style_array, chars, section[:start], section[:end])
                .map { |sub| style_tag_markup(sub) }
                .join

        return inner unless section[:type] == "ENTITY"

        entity = entity_map[section[:entity_key].to_s]
        entity_type = entity && entity["type"]

        unless entity_type == "LINK"
          warnings << "unrecognized entity type #{entity_type.inspect}; rendering its text without entity markup"
          return inner
        end

        href = entity.dig("data", "url")
        target = entity.dig("data", "targetOption") || "_self"
        "<a href=\"#{href}\" target=\"#{target}\">#{inner}</a>"
      end

      # Splits [start_idx, end_idx) into runs where the set of active inline styles is constant.
      def inline_style_sections(style_array, chars, start_idx, end_idx)
        sections = []
        current = nil

        (start_idx...end_idx).each do |i|
          styles_here = INLINE_STYLE_NEST_ORDER.select { |s| style_array[s][i] }

          if current && current[:styles] == styles_here
            current[:text] << chars[i]
          else
            current = { styles: styles_here, text: [chars[i]] }
            sections << current
          end
        end

        sections
      end

      def style_tag_markup(sub_section)
        content = escape_text(sub_section[:text])
        sub_section[:styles].each do |style|
          tag = INLINE_STYLE_TAGS[style]
          content = "<#{tag}>#{content}</#{tag}>"
        end
        content
      end

      def escape_text(chars)
        chars.map do |ch|
          case ch
          when "\n" then "<br>"
          when "&" then "&amp;"
          when "<" then "&lt;"
          when ">" then "&gt;"
          else ch
          end
        end.join
      end

      def trim_leading_nbsp(text)
        return text if text.nil? || text.empty?

        chars = text.chars
        i = 0
        while i < chars.length && chars[i] == " "
          chars[i] = "&nbsp;"
          i += 1
        end
        chars.join
      end

      def trim_trailing_nbsp(text)
        return text if text.nil? || text.empty?

        chars = text.chars
        i = chars.length - 1
        while i >= 0 && chars[i] == " "
          chars[i] = "&nbsp;"
          i -= 1
        end
        chars.join
      end
    end
  end
end
