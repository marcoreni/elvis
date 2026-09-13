# frozen_string_literal: true

class FormuleItem < ApplicationRecord
  belongs_to :formule
  belongs_to :item, polymorphic: true

  validates :item_type, inclusion: { in: %w[ActivityRef ActivityRefKind] }

  def self.class_name_gender
    :M
  end

  def is_for_kind
    item_type == ActivityRefKind.name
  end
end
