# == Schema Information
#
# Table name: additional_students
#
#  id                  :bigint           not null, primary key
#  desired_activity_id :bigint
#  user_id             :bigint
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

class AdditionalStudent < ApplicationRecord
  belongs_to :desired_activity
  belongs_to :user

  def self.class_name_gender
    :M
  end
end
