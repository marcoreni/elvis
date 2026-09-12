# == Schema Information
#
# Table name: payment_schedule_statuses
#
#  id         :bigint           not null, primary key
#  label      :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class PaymentScheduleStatus < ApplicationRecord
  def self.class_name_gender
    :M
  end
end
