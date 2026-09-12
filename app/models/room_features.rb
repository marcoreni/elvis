# == Schema Information
#
# Table name: room_features
#
#  id     :bigint           not null, primary key
#  name   :string
#  active :boolean          default(FALSE)
#
class RoomFeatures < ApplicationRecord
  def self.class_name_gender
    :F
  end
end
