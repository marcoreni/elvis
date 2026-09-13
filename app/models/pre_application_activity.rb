# frozen_string_literal: true

# == Schema Information
#
# Table name: pre_application_activities
#
#  id                      :bigint           not null, primary key
#  status                  :boolean
#  comment                 :string
#  action                  :string
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  pre_application_id      :bigint
#  activity_id             :bigint
#  activity_application_id :bigint
#

class PreApplicationActivity < ApplicationRecord
  belongs_to :pre_application
  belongs_to :activity

  belongs_to :activity_application, optional: true

  def self.class_name_gender
    :M
  end

  def reset
    self.status = false
    self.action = ""
    save!
  end
end
