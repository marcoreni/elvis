# == Schema Information
#
# Table name: application_change_questionnaires
#
#  id          :bigint           not null, primary key
#  activity_id :bigint
#  user_id     :bigint
#  season_id   :bigint
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#

class ApplicationChangeQuestionnaire < ApplicationRecord
  belongs_to :season
  belongs_to :activity
  belongs_to :user

  has_many :answers, as: :answerable, dependent: :destroy

  def self.class_name_gender
    :M
  end
end
