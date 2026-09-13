# frozen_string_literal: true

class AddZoneToSchools < ActiveRecord::Migration[6.1]
  def change
    add_column :schools, :zone, :string
  end
end
