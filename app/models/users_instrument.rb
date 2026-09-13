# frozen_string_literal: true

# == Schema Information
#
# Table name: users_instruments
#
#  id            :bigint           not null, primary key
#  user_id       :bigint
#  instrument_id :bigint
#

class UsersInstrument < ApplicationRecord
  belongs_to :user
  belongs_to :instrument

  def self.class_name_gender
    :F
  end
end
