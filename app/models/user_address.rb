# frozen_string_literal: true

# == Schema Information
#
# Table name: user_addresses
#
#  id         :bigint           not null, primary key
#  user_id    :bigint           not null
#  address_id :bigint           not null
#

class UserAddress < ApplicationRecord
  belongs_to :user
  belongs_to :address
  belongs_to :address_csv, lambda {
    select(:id, :street_address, :postcode, :city)
  }, class_name: "Address", required: false

  def self.class_name_gender
    :F
  end
end
