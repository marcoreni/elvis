# frozen_string_literal: true

# == Schema Information
#
# Table name: hours_sheets
#
#  user_id     :bigint           not null
#  year        :integer          not null
#  month       :integer          not null
#  json_sheet  :jsonb
#  is_complete :boolean          default(TRUE)
#

# /!\ ........................................................ /!\
#       DEPRECATED : plus utilisée
# /!\ ........................................................ /!\

class HoursSheet < ApplicationRecord
  belongs_to :user, required: true

  def self.class_name_gender
    :F
  end
end
