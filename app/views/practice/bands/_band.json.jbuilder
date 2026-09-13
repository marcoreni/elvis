# frozen_string_literal: true

json.extract! band, :id, :name, :blacklisted, :created_at, :updated_at
json.url practice_band_url(band, format: :json)
