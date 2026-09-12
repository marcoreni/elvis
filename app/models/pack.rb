class Pack < ApplicationRecord
  belongs_to :user
  belongs_to :activity_ref_pricing
  belongs_to :season

  has_one :activity_ref, through: :activity_ref_pricing
  has_one :discount, as: :discountable, dependent: :destroy

  def self.class_name_gender
    :M
  end
end
