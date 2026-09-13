# frozen_string_literal: true

# == Schema Information
#
# Table name: failed_payment_import_reasons
#
#  id    :bigint           not null, primary key
#  code  :string           not null
#  label :string           not null
#  color :string
#

class FailedPaymentImportReason < ApplicationRecord
  def self.class_name_gender
    :M
  end
end
