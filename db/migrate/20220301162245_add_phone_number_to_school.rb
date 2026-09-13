# frozen_string_literal: true

class AddPhoneNumberToSchool < ActiveRecord::Migration[6.1]
  def change
    add_column :schools, :phone_number, :string
  end
end
