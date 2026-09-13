# frozen_string_literal: true

json.extract! material, :id, :name, :created_at, :updated_at
json.url material_url(material, format: :json)
