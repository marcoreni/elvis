# frozen_string_literal: true

# == Schema Information
#
# Table name: student_evaluations
#
#  id          :bigint           not null, primary key
#  activity_id :bigint
#  teacher_id  :bigint
#  student_id  :bigint
#  season_id   :bigint
#

class StudentEvaluationSerializer < ActiveModel::Serializer
  has_many :answers

  attributes :id, :activity_id, :teacher_id, :student_id, :season_id
end
