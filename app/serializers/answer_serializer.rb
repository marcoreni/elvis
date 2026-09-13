# frozen_string_literal: true

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

class AnswerSerializer < ActiveModel::Serializer
  attributes :id, :question_id, :value
end
