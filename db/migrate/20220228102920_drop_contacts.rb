# frozen_string_literal: true

class DropContacts < ActiveRecord::Migration[6.1]
  def change
    drop_table :contacts
  end
end
