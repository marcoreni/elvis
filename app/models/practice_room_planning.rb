# == Schema Information
#
# Table name: practice_room_plannings
#
#  id                         :bigint           not null, primary key
#  room_id                    :string
#  monday_is_open             :boolean          default(TRUE)
#  tuesday_is_open            :boolean          default(TRUE)
#  wednesday_is_open          :boolean          default(TRUE)
#  thursday_is_open           :boolean          default(TRUE)
#  friday_is_open             :boolean          default(TRUE)
#  saturday_is_open           :boolean          default(FALSE)
#  sunday_is_open             :boolean          default(FALSE)
#  monday_time_interval_id    :integer
#  tuesday_time_interval_id   :integer
#  wednesday_time_interval_id :integer
#  thursday_time_interval_id  :integer
#  friday_time_interval_id    :integer
#  saturday_time_interval_id  :integer
#  sunday_time_interval_id    :integer
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#
class PracticeRoomPlanning < ApplicationRecord
  belongs_to :monday, class_name: "TimeInterval", foreign_key: :monday_time_interval_id, optional: true
  belongs_to :tuesday, class_name: "TimeInterval", foreign_key: :tuesday_time_interval_id, optional: true
  belongs_to :wednesday, class_name: "TimeInterval", foreign_key: :wednesday_time_interval_id, optional: true
  belongs_to :thursday, class_name: "TimeInterval", foreign_key: :thursday_time_interval_id, optional: true
  belongs_to :friday, class_name: "TimeInterval", foreign_key: :friday_time_interval_id, optional: true
  belongs_to :saturday, class_name: "TimeInterval", foreign_key: :saturday_time_interval_id, optional: true
  belongs_to :sunday, class_name: "TimeInterval", foreign_key: :sunday_time_interval_id, optional: true

  after_create :create_all_days_intervals

  def self.display_class_name(singular = true)
    singular ? "planning de salle de répétition" : "plannings des salles de répétition"
  end

  def self.class_name_gender
    :M
  end

  def create_all_days_intervals
    create_monday if monday.nil?
    create_tuesday if tuesday.nil?
    create_wednesday if wednesday.nil?
    create_thursday if thursday.nil?
    create_friday if friday.nil?
    create_saturday if saturday.nil?
    create_sunday if sunday.nil?
  end

  def set_monday(new_start = nil, new_end = nil)
    new_start = monday.start if new_start.nil?
    new_end = monday.end if new_end.nil?
    monday.change_start_and_end(new_start, new_end)
  end

  def set_tuesday(new_start = nil, new_end = nil)
    new_start = tuesday.start if new_start.nil?
    new_end = tuesday.end if new_end.nil?
    tuesday.change_start_and_end(new_start, new_end)
  end

  def set_wednesday(new_start = nil, new_end = nil)
    new_start = wednesday.start if new_start.nil?
    new_end = wednesday.end if new_end.nil?
    wednesday.change_start_and_end(new_start, new_end)
  end

  def set_thursday(new_start = nil, new_end = nil)
    new_start = thursday.start if new_start.nil?
    new_end = thursday.end if new_end.nil?
    thursday.change_start_and_end(new_start, new_end)
  end

  def set_friday(new_start = nil, new_end = nil)
    new_start = friday.start if new_start.nil?
    new_end = friday.end if new_end.nil?
    friday.change_start_and_end(new_start, new_end)
  end

  def set_saturday(new_start = nil, new_end = nil)
    new_start = saturday.start if new_start.nil?
    new_end = saturday.end if new_end.nil?
    saturday.change_start_and_end(new_start, new_end)
  end

  def set_sunday(new_start = nil, new_end = nil)
    new_start = sunday.start if new_start.nil?
    new_end = sunday.end if new_end.nil?
    sunday.change_start_and_end(new_start, new_end)
  end
end
