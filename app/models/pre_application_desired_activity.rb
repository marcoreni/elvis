# frozen_string_literal: true

# == Schema Information
#
# Table name: pre_application_desired_activities
#
#  id                      :bigint           not null, primary key
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  pre_application_id      :bigint
#  desired_activity_id     :bigint
#  status                  :boolean
#  action                  :string           default("new")
#  activity_application_id :bigint
#

class PreApplicationDesiredActivity < ApplicationRecord
  belongs_to :pre_application
  belongs_to :desired_activity

  belongs_to :activity_application, optional: true

  def self.class_name_gender
    :M
  end
end
