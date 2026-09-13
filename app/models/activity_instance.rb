# frozen_string_literal: true

# == Schema Information
#
# Table name: activity_instances
#
#  id                :bigint           not null, primary key
#  time_interval_id  :bigint
#  room_id           :bigint
#  location_id       :bigint
#  activity_id       :bigint
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  cover_teacher_id  :bigint
#  are_hours_counted :boolean          default(TRUE)
#

class ActivityInstance < ApplicationRecord
  belongs_to :time_interval
  belongs_to :room, required: false
  belongs_to :location, required: false
  belongs_to :activity
  belongs_to :cover_teacher, class_name: :User, optional: true

  has_many :teachers_activity_instances, dependent: :destroy
  has_many :teachers, through: :teachers_activity_instances

  has_many :student_attendances, dependent: :destroy

  attribute :start, :datetime
  attribute :end, :datetime

  def self.class_name_gender
    :F
  end

  def start
    time_interval&.start
  end

  def end
    time_interval&.end
  end

  def teacher
    #  For the moment this is just a shortcut across associations
    # but this will certainly evolve once we allow for the edition of the
    # instance to allow substitution
    activity.teacher
  end

  def change_teacher(teacher_id)
    ActivityInstance.transaction do
      teachers_activity_instance = teachers_activity_instances.find_by(is_main: true)

      if teachers_activity_instance
        remove_teacher(teachers_activity_instance.user_id)
        add_teacher(teacher_id, true)
      end
    end
  end

  # Checks how many students are registered as applied to this activity
  # when the instance takes place
  def active_students
    students = activity.users

    students.to_a - inactive_students.to_a
  end

  # Returns inactive students from this activity_instance
  def inactive_students
    lesson_time = time_interval&.start

    return [] unless lesson_time

    activity.users
            .joins(activity_applications: :desired_activities)
            .where("desired_activities.activity_id = ?
              AND ((activity_applications.stopped_at IS NOT NULL AND (activity_applications.stopped_at AT TIME ZONE 'GMT' AT TIME ZONE 'Europe/Paris')::date <= ?::date)
              OR (activity_applications.begin_at AT TIME ZONE 'GMT' AT TIME ZONE 'Europe/Paris')::date > ?::date)",
                   activity_id, lesson_time, lesson_time)
  end

  def change_cover_teacher(teacher_id)
    cover_teacher = User.find_by(id: teacher_id)

    ActivityInstance.transaction do
      self.cover_teacher.planning.time_intervals.delete(time_interval) if self.cover_teacher
      # Cover teacher can be nil if we want to remove the covering teacher from the instance
      if cover_teacher
        # Add this instance's time_interval to the covering teacher's planning
        cover_teacher.planning.time_intervals << time_interval
      end
      # Set this instance's cover teacher to the given teacher
      update!(cover_teacher: cover_teacher)
    end
  end

  def add_teacher(id, is_main)
    teacher = User.teachers.find(id)

    return unless teacher

    # Looking for all instances to update
    following_instances = activity.activity_instances.joins(:time_interval).where("time_intervals.start >= ?",
                                                                                  time_interval.start)

    ActivityInstance.transaction do
      duration = 0

      following_instances.each do |ins|
        ins.teachers_activity_instances.create(teacher: teacher, is_main: is_main)
        ins.teachers.reload

        ins.time_interval.plannings.push(teacher.planning)
        duration += ((ins.time_interval.end - ins.time_interval.start) / 3600).round
      end

      teacher.planning.hours_count += duration
      teacher.save!
    end
  end

  def remove_teacher(id)
    teacher = User.teachers.find(id)

    return unless teacher

    # Looking for all instances to update
    following_instances = activity.activity_instances.joins(:time_interval).where("time_intervals.start >= ?",
                                                                                  time_interval.start)

    ActivityInstance.transaction do
      duration = 0

      following_instances.each do |ins|
        # Unset teacher from instance
        ins.teachers.destroy(teacher)
        # Removes this lesson from the teacher's planning
        ins.time_interval.plannings.destroy(teacher.planning)
        # Calculates
        duration += ((ins.time_interval.end - ins.time_interval.start) / 3600).round
      end

      teacher.planning.hours_count -= duration
      teacher.save!
    end
  end

  def potential_covering_teachers
    activity_ref = activity && activity.activity_ref_id

    (User
      .includes(:activity_refs)
      .joins(:activity_refs)
      .where({
               activity_refs: {
                 id: activity_ref
               }
             })
      .teachers
      .all -
     User
       .joins(planning: :time_intervals)
       .teachers
       .where(
         "tsrange(?, ?, '()') && tsrange(time_intervals.start, time_intervals.end, '()')",
         time_interval.start,
         time_interval.end
       ).uniq)
      .map(&:id)
  end

  def check_for_conflict
    #  Check if the time_interval for an instance has any conflict
    # if it has, we return the newly created conflict
    season = Season.current
    season.holidays.map { |h| h.date }

    conflict_type = time_interval.check_for_conflict(teacher, room)

    conflict = Conflict.new(ts: time_interval.start, is_resolved: false,
                            plannings: time_interval.plannings.uniq, activity_instance: self)

    case conflict_type
    when "room"
      conflict.kind = "room"
    when "teacher"
      conflict.kind = "teacher"
    when "holiday"
      conflict.kind = "holiday"
    end

    return nil unless conflict_type

    conflict.save
    conflict
  end

  # Returns the duration of the instance in minutes
  # @return [Integer] the duration of the instance in minutes
  def duration
    (time_interval.end - time_interval.start) / 60
  end
end
