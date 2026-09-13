# frozen_string_literal: true

json.extract! band_type, :id, :name, :created_at, :updated_at
json.url band_type_url(band_type, format: :json)
