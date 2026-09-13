# frozen_string_literal: true

# == Schema Information
#
# Table name: options
#
#  id                  :bigint           not null, primary key
#  desired_activity_id :integer
#  activity_id         :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  deleted_at          :datetime
#

class Option < ApplicationRecord
  acts_as_paranoid

  belongs_to :activity
  belongs_to :desired_activity

  def self.class_name_gender
    :F
  end

  def user
    desired_activity&.activity_application&.user
  end
end
