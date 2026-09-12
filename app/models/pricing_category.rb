# frozen_string_literal: true

class PricingCategory < ApplicationRecord
  has_many :activity_ref_pricing

  def self.class_name_gender
    :M
  end
end
