# frozen_string_literal: true

class AddUniqueIndexToDiscounts < ActiveRecord::Migration[6.1]
  def change
    add_index :discounts, %i[discountable_type discountable_id], unique: true
  end
end
