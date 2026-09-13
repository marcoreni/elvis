# frozen_string_literal: true

# == Schema Information
#
# Table name: pre_applications
#
#  id         :bigint           not null, primary key
#  user_id    :bigint
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  season_id  :bigint
#

class PreApplication < ApplicationRecord
  belongs_to :user
  belongs_to :season

  has_many :pre_application_activities
  has_many :activities, through: :pre_application_activities

  has_many :pre_application_desired_activities
  has_many :desired_activities, through: :pre_application_desired_activities

  def self.class_name_gender
    :F
  end

  # Instruction permettant de supprimer un objet utilisant la classe courante
  # @param source_object [ApplicationRecord]
  # @return [{ instruction: String, possible: Boolean }]
  def undeletable_instruction(source_object = nil)
    case source_object.class.to_s
    when User.to_s
      { instruction: I18n.t("models.pre_application.undeletable_instruction.pre_registered"), possible: false }
    else
      super
    end
  end
end
