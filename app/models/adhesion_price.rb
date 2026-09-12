# == Schema Information
#
# Table name: adhesion_prices
#
#  id         :bigint           not null, primary key
#  label      :string
#  price      :float
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  season_id  :bigint
#
class AdhesionPrice < ApplicationRecord
  belongs_to :season, optional: true

  has_many :adhesions, dependent: :restrict_with_error

  validates_presence_of :label, message: :blank
  validates_presence_of :price, message: :blank
  validates_numericality_of :price, greater_than_or_equal_to: 0, message: :greater_than_or_equal_to

  validates_uniqueness_of :season_id, message: :taken, allow_nil: true
end
