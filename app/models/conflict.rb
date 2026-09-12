# == Schema Information
#
# Table name: conflicts
#
#  id                   :bigint           not null, primary key
#  ts                   :datetime
#  kind                 :string
#  is_resolved          :boolean
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  activity_instance_id :bigint
#

class Conflict < ApplicationRecord
  has_many :planning_conflicts
  has_many :plannings, through: :planning_conflicts

  belongs_to :activity_instance

  def self.class_name_gender
    :M
  end
end
