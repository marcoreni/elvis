# frozen_string_literal: true

# == Schema Information
#
# Table name: locations
#
#  id         :bigint           not null, primary key
#  label      :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class Location < ApplicationRecord
  has_many :room
  validates :label, uniqueness: true

  def self.class_name_gender
    :M
  end
end
