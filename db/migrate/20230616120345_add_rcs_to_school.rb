# frozen_string_literal: true

class AddRcsToSchool < ActiveRecord::Migration[6.1]
  def change
    add_column :schools, :rcs, :string, null: true
  end
end
