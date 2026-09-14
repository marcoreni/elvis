# frozen_string_literal: true

# Powers the accent-insensitive matching in Search::OmnisearchService (replaces Elasticsearch's
# asciifolding analyzer filter, removed along with Elasticsearch itself) -- e.g. "Ecole" still
# matches "École".
class EnableUnaccentExtension < ActiveRecord::Migration[6.1]
  def change
    enable_extension "unaccent"
  end
end
