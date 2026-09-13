# frozen_string_literal: true

# == Schema Information
#
# Table name: time_slots
#
#  id               :bigint           not null, primary key
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  time_interval_id :bigint
#  planning_id      :bigint
#

class TimeSlot < ApplicationRecord
  belongs_to :planning
  belongs_to :time_interval
  belongs_to :time_interval_csv, lambda {
    select(:id, :start, :is_validated, :end)
  }, class_name: "TimeInterval", required: false

  def self.class_name_gender
    :M
  end
end
