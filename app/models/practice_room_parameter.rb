# frozen_string_literal: true

# == Schema Information
#
# Table name: practice_room_parameters
#
#  id                        :bigint           not null, primary key
#  room_id                   :integer
#  duration                  :time
#  practice_room_planning_id :integer
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#
class PracticeRoomParameter < ApplicationRecord
  belongs_to :room
  belongs_to :practice_room_planning, optional: true

  # scope :by_room, ->(id) {where(room_id: id).first}

  after_create :create_room_planning

  def self.class_name_gender
    :M
  end

  def create_room_planning
    create_practice_room_planning!
    save!
  end
end
