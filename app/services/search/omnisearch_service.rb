# frozen_string_literal: true

module Search
  # Powers the global "omnisearch" search box (frontend/components/Omnisearch.jsx, POST /omnisearch).
  # Replaces the former Chewy/Elasticsearch multi_match query (5 indices, cross_fields, operator:
  # and) -- same result "kind"/"attributes" shape the frontend already expects, same "every query
  # word must appear somewhere across these fields" semantics, now backed by plain Postgres
  # ILIKE + unaccent instead of an ES index. Only the fields the original multi_match actually
  # searched are matched here; other indexed-but-unsearched attributes (user_age, room_floor, etc.)
  # are still returned, just never matched against.
  class OmnisearchService
    PER_SOURCE_LIMIT = 20
    RESULT_LIMIT = 15

    SOURCE_METHODS = %i[
      search_users
      search_activity_applications
      search_adhesions
      search_activity_refs
      search_rooms
    ].freeze

    COUNT_METHODS = %i[
      count_users
      count_activity_applications
      count_adhesions
      count_activity_refs
      count_rooms
    ].freeze

    def self.call(search_value)
      new(search_value).call
    end

    def initialize(search_value)
      # Split ON punctuation rather than deleting it: a plain gsub-delete would turn "Jean-Pierre"
      # into the single token "jeanpierre", which then never matches the stored "Jean-Pierre" --
      # same trap for "O'Brien" and any dotted email address (all three are real, searched fields).
      # Tokens are still alnum-only either way, so match_clause's wildcard-escaping reasoning holds.
      @words = search_value.to_s.split(/[^\p{L}\p{N}]+/).reject(&:blank?).first(10)
    end

    def call
      return { results: [], total: 0 } if @words.empty?

      per_source = SOURCE_METHODS.map { |method| send(method) }
      total = COUNT_METHODS.sum { |method| send(method) }

      { results: interleave(per_source).first(RESULT_LIMIT).map { |attrs| { attributes: attrs } }, total: total }
    end

    private

    # Concatenating each source's matches source-by-source would let one high-volume source (e.g.
    # users) fill every result slot before a genuinely relevant match from another source is even
    # considered. Round-robin across sources instead, so a strong room/activity match can't be
    # starved out by a large number of weak user matches.
    def interleave(arrays)
      Array.new(arrays.map(&:length).max.to_i) { |i| arrays.map { |a| a[i] } }.flatten.compact
    end

    # Builds "(unaccent(lower(field1)) ILIKE unaccent(?) OR unaccent(lower(field2)) ILIKE ... )",
    # repeated (AND-ed) once per search word -- every word must match somewhere across the given
    # fields, matching the old ES cross_fields multi_match's "operator: and" behavior. @words is
    # already alnum-only (see #initialize), so no LIKE-wildcard-character escaping is needed.
    def match_clause(*fields)
      per_word = @words.map do |word|
        pattern = "%#{word}%"
        ors = fields.map { |f| "unaccent(lower(#{f})) ILIKE unaccent(?)" }.join(" OR ")
        ["(#{ors})", fields.map { pattern }]
      end

      [per_word.map(&:first).join(" AND "), *per_word.flat_map(&:last)]
    end

    # A crude but real relevance proxy, cheap without pg_trgm/tsvector: within one source, shorter
    # matched text tends to be a closer/more exact hit than longer text that merely happens to
    # contain the same words somewhere -- e.g. searching "jean" ranks a user literally named "Jean"
    # above "Jean-Baptiste Delacroix-Fontenay". id_column is just a stable tiebreak, not itself
    # meaningful -- must be qualified (e.g. "users.id") for the joined sources.
    def relevance_order(length_exprs, id_column: "id")
      Arel.sql("(#{length_exprs.join(' + ')}) ASC, #{id_column} ASC")
    end

    def search_users
      User
        .where(match_clause("first_name", "last_name", "email", "adherent_number::text"))
        .order(relevance_order(["length(first_name)", "length(last_name)"]))
        .limit(PER_SOURCE_LIMIT)
        .pluck(:id, :first_name, :last_name, :adherent_number)
        .map do |id, first_name, last_name, adherent_number|
          {
            kind: "user",
            user_id: id,
            user_first_name: first_name,
            user_last_name: last_name,
            user_adherent_number: adherent_number
          }
        end
    end

    def count_users
      User.where(match_clause("first_name", "last_name", "email", "adherent_number::text")).count
    end

    def search_activity_applications
      ActivityApplication
        .joins(:user, :activity_application_status)
        .where(match_clause(
                 "users.first_name", "users.last_name",
                 "activity_application_statuses.label", "activity_applications.id::text"
               ))
        .order(relevance_order(
                 ["length(users.first_name)", "length(users.last_name)"], id_column: "activity_applications.id"
               ))
        .limit(PER_SOURCE_LIMIT)
        .pluck("activity_applications.id", "users.first_name", "users.last_name", "activity_application_statuses.label")
        .map do |id, first_name, last_name, status_label|
          {
            kind: "activityapplication",
            application_id: id,
            application_first_name: first_name,
            application_last_name: last_name,
            application_status: status_label
          }
        end
    end

    def count_activity_applications
      ActivityApplication
        .joins(:user, :activity_application_status)
        .where(match_clause(
                 "users.first_name", "users.last_name",
                 "activity_application_statuses.label", "activity_applications.id::text"
               ))
        .count
    end

    def search_adhesions
      Adhesion
        .joins(:user)
        .where(match_clause("users.first_name", "users.last_name", "users.adherent_number::text"))
        .order(relevance_order(["length(users.first_name)", "length(users.last_name)"], id_column: "users.id"))
        .limit(PER_SOURCE_LIMIT)
        .pluck("users.id", "users.adherent_number", "users.first_name", "users.last_name")
        .uniq # one user can have several adhesions; only the member's own fields are shown, so dedupe.
        .map do |user_id, adherent_number, first_name, last_name|
          {
            kind: "adhesion",
            adhesion_user_id: user_id,
            adhesion_adherent_number: adherent_number,
            adhesion_first_name: first_name,
            adhesion_last_name: last_name
          }
        end
    end

    def count_adhesions
      Adhesion
        .joins(:user)
        .where(match_clause("users.first_name", "users.last_name", "users.adherent_number::text"))
        .distinct
        .count("users.id")
    end

    def search_activity_refs
      ActivityRef
        .where(match_clause("label"))
        .order(relevance_order(["length(label)"]))
        .limit(PER_SOURCE_LIMIT)
        .pluck(:id, :label)
        .map { |id, label| { kind: "activityref", activity_id: id, activity_name: label } }
    end

    def count_activity_refs
      ActivityRef.where(match_clause("label")).count
    end

    def search_rooms
      Room
        .where(match_clause("label"))
        .order(relevance_order(["length(label)"]))
        .limit(PER_SOURCE_LIMIT)
        .pluck(:id, :label, :floor, :is_practice_room)
        .map do |id, label, floor, is_practice_room|
          {
            kind: "room",
            room_id: id,
            room_name: label,
            room_floor: floor,
            is_practice_room: is_practice_room
          }
        end
    end

    def count_rooms
      Room.where(match_clause("label")).count
    end
  end
end
