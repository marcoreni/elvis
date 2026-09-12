# frozen_string_literal: true

require_relative "user_drop"
require_relative "activity_ref_drop"
require_relative "time_interval_drop"

module LiquidDrops
  class ActivityDrop < Liquid::Drop

    def initialize(activity)
      @activity = activity
    end

    def id
      @activity["id"]
    end

    def label
      @activity["activity_ref"]["label"]
    end

    # Views (activity_assigned_mailer/activity_assigned.html.erb) call @activity.activity_ref
    # .label directly, rather than this drop's own flattened label/display_name accessors.
    def activity_ref
      ActivityRefDrop.new(@activity["activity_ref"])
    end

    # Views call @activity.time_interval.start / .end (as real Time-like objects, on which they
    # call .strftime) directly, rather than this drop's own flattened activity_start/activity_end
    # accessors.
    def time_interval
      TimeIntervalDrop.new(@activity["time_interval"])
    end

    # Views call @activity.teachers.first.full_name -- @activity["teachers"] is the full
    # has_many :teachers collection (see ActivityAssignedMailer#activity_assigned's
    # `teachers: {}` include), as opposed to @activity["teacher"] which only holds the single
    # "main" teacher used by #teacher_email/#teacher_first_name/#teacher_last_name below.
    def teachers
      (@activity["teachers"] || []).map { |teacher| UserDrop.new(teacher) }
    end

    def display_name
      @activity["activity_ref"]["display_name"]
    end

    def refKind
      @activity["activity_ref"]["kind"]
    end

    def activity_ref_kind_id
      @activity["activity_ref"]["activity_ref_kind_id"]
    end

    def occupation_limit
      @activity["activity_ref"]["occupation_limit"]
    end

    def display_price
      ActiveSupport::NumberHelper::number_to_currency @activity["activity_ref"]["display_price"]
    end

    def from_age
      @activity["activity_ref"]["from_age"]
    end

    def to_age
      @activity["activity_ref"]["to_age"]
    end

    def teacher_email
      @activity["teacher"]["email"]
    end

    def teacher_first_name
      @activity["teacher"]["first_name"]
    end

    def teacher_last_name
      @activity["teacher"]["last_name"]
    end

    def room_label
      @activity["room"]["label"]
    end

    def room_kind
      @activity["room"]["kind"]
    end

    def activity_start
      DateTime.parse(@activity["time_interval"]["start"]).strftime("%H:%M")
    end

    def activity_end
      DateTime.parse(@activity["time_interval"]["end"]).strftime("%H:%M")
    end

    def startDate
      I18n.l(DateTime.parse(@activity["time_interval"]["end"]), format: "%A %d ")
    end

    def day_in_week
      I18n.l(DateTime.parse(@activity["time_interval"]["end"]), format: "%A")
    end

  end
end

