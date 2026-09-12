# == Schema Information
#
# Table name: room_room_features
#
#  id               :bigint           not null, primary key
#  room_id          :bigint
#  room_features_id :bigint
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#
class RoomRoomFeature < ApplicationRecord
  belongs_to :room
  belongs_to :room_features

  def self.class_name_gender
    :F
  end
end
