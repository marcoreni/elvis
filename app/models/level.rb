# == Schema Information
#
# Table name: levels
#
#  id                      :bigint           not null, primary key
#  evaluation_level_ref_id :integer
#  activity_ref_id         :integer
#  user_id                 :integer
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  season_id               :bigint
#  can_continue            :boolean
#

class Level < ApplicationRecord
  belongs_to :evaluation_level_ref, optional: true
  belongs_to :evaluation_level_ref_csv, -> { select(:id, :label) }, class_name: "EvaluationLevelRef", optional: true
  belongs_to :activity_ref
  belongs_to :activity_ref_csv, -> { select(:id, :label) }, class_name: "ActivityRef", optional: true
  belongs_to :season, optional: true
  belongs_to :user

  validate :uniqueness

  def self.display_class_name(singular = true)
    singular ? "niveau" : "niveaux"
  end

  def self.class_name_gender
    :M
  end

  private

  def uniqueness
    query = Level.where(activity_ref_id: activity_ref_id, season_id: season_id, user_id: user_id)

    query = query.where.not(id: id) if id.present? && id.positive?

    return unless query.any?

    errors.add(:base, :duplicate, season: season.label, activity: activity_ref.label, user: user.full_name)
  end
end
