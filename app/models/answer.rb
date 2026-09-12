# == Schema Information
#
# Table name: answers
#
#  id              :bigint           not null, primary key
#  question_id     :bigint
#  answerable_id   :bigint
#  value           :text
#  answerable_type :string
#

class Answer < ApplicationRecord
  belongs_to :answerable, polymorphic: true
  belongs_to :question

  def self.class_name_gender
    :F
  end
end
