# == Schema Information
#
# Table name: plannings
#
#  id          :bigint           not null, primary key
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  user_id     :bigint
#  hours_count :float            default(0.0)
#  is_locked   :boolean          default(FALSE)
#

class Planning < ApplicationRecord
  belongs_to :user, optional: true

  has_many :time_slots, dependent: :destroy
  has_many :time_intervals, through: :time_slots
  has_many :time_intervals_csv, through: :time_slots, source: :time_interval_csv

  has_many :planning_conflicts
  has_many :conflicts, through: :planning_conflicts

  def self.display_class_name(singular = true)
    singular ? "planning" : "planning"
  end

  def self.class_name_gender
    :M
  end

  def update_intervals(intervals, season_id)
    intervalList = []

    season = nil
    season = Season.find(season_id) unless season_id.blank?

    intervals.each do |i|
      # isRecurrent if only a param on planning when new interval is created
      if i["recurrentType"]&.present?
        interval = TimeInterval.new(start: i["start"], end: i["end"], kind: i["kind"] || "d",
                                    is_validated: i["is_validated"] || false)

        season = Season.from_interval(interval).first || Season.current

        recurrence_end = season.end
        recurrence_step = case i["recurrentType"]
                          when "weekly"
                            1.week
                          when "biweekly"
                            2.weeks
                          when "monthly"
                            1.month
                          when "bimonthly"
                            2.months
                          when "yearly"
                            1.year
                          else
                            1.week
                          end

        holiday_dates = season.holidays.map { |h| h.date }

        while interval.end < recurrence_end
          intervalList << interval if !holiday_dates.include?(interval.start&.to_date) && interval.save

          interval = interval.dup
          interval.id = nil
          interval.start += recurrence_step
          interval.end += recurrence_step
        end
      else
        interval = if i["isNew"] == true
                     TimeInterval.new
                   else
                     TimeInterval.find_or_initialize_by(id: i["id"])
                   end
        interval.start = i["start"]
        interval.end = i["end"]
        interval.convert_to_first_week_of_season(season) unless season.nil?
        interval.kind = i["kind"] || "d"
        interval.is_validated = i["is_validated"] || false
        interval.save
      end

      intervalList << interval if time_intervals.where(id: interval.id).none?
    end

    time_intervals << intervalList
    intervalList
  end

  def create_availability(time_interval)
    season = Season.next
    week_start = season.start.beginning_of_week
    week_end = season.start.end_of_week
    week_range = (week_start.to_date..week_end.to_date).step(1.day).each { |d| d }.to_a
    week_day = time_interval.start.wday
    target_day = week_range.select { |day| day.wday == week_day }.first

    new_availability = time_interval.dup
    new_availability.start = new_availability.start.change(year: target_day.year, month: target_day.month,
                                                           day: target_day.day)
    new_availability.end = new_availability.end.change(year: target_day.year, month: target_day.month,
                                                       day: target_day.day)
    new_availability.kind = "p"
    new_availability.is_validated = false
    new_availability.save

    time_intervals << new_availability
    save
  end
end
