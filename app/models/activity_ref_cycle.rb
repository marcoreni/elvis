# frozen_string_literal: true

# == Schema Information
#
# Table name: activity_ref_cycles
#
#  id                   :bigint           not null, primary key
#  from_activity_ref_id :bigint
#  to_activity_ref_id   :bigint
#

class ActivityRefCycle < ApplicationRecord
  belongs_to :from, class_name: :ActivityRef, foreign_key: :from_activity_ref_id
  belongs_to :to, class_name: :ActivityRef, foreign_key: :to_activity_ref_id

  def self.class_name_gender
    :M
  end
end
