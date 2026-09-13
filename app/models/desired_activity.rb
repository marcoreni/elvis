# frozen_string_literal: true

# == Schema Information
#
# Table name: desired_activities
#
#  id                      :bigint           not null, primary key
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  activity_ref_id         :bigint
#  activity_application_id :bigint
#  is_validated            :boolean          default(FALSE)
#  activity_id             :integer
#  payment_frequency       :integer
#  pricing_category_id              :bigint
#  prorata                 :integer
#  prorata_amount          :decimal(, )
#  deleted_at              :datetime
#

class DesiredActivity < ApplicationRecord
  acts_as_paranoid

  belongs_to :activity_ref
  belongs_to :activity_ref_csv, -> { select(:id, :label) }, class_name: "ActivityRef", required: false
  belongs_to :activity_application
  belongs_to :activity, optional: true
  belongs_to :pricing_category, optional: true

  has_many :options, dependent: :destroy

  has_one :user, through: :activity_application
  has_one :discount, as: :discountable, dependent: :destroy

  def self.class_name_gender
    :F
  end

  def add_option(activity_id)
    options.find_or_create_by!(activity_id: activity_id)
  end

  def remove_option(activity_id)
    options.destroy(Option.find_by(activity_id: activity_id))
  end

  def get_price
    case payment_frequency
    when 1, 12
      activity_ref.annual_price
    when 3
      activity_ref.quarterly_price
    when 10
      activity_ref.monthly_price
    when 11
      activity_ref.special_price
    when 13
      floor2(activity_ref.annual_price * 0.95, 2)
    else
      0
    end
  end

  def get_price_format
    case payment_frequency
    when 1, 12
      "annuel"
    when 3
      "trimestriel"
    when 10
      "mensuel"
    when 11
      "annuel"
    when 13
      "annuel -5%"
    else
      "annuel"
    end
  end

  private

  def floor2(value, exp = 0)
    multiplier = 10**exp
    (value * multiplier).floor.to_f / multiplier.to_f
  end

  def pre_destroy
    Activity.find(activity_id).remove_student(id) if is_validated
    additional_student = AdditionalStudent.find_by(desired_activity_id: id)
    additional_student&.delete
  end
end
