# frozen_string_literal: true

module LiquidDrops
  # Wraps an activity's nested "time_interval" hash so views that call @activity.time_interval
  # .start / .end directly (rather than ActivityDrop's own flattened activity_start/activity_end
  # accessors) resolve correctly. Returns real DateTime objects (the view calls .strftime on
  # them), not the raw serialized strings, mirroring ActivityDrop#activity_start/#activity_end's
  # own DateTime.parse. See ActivityDrop#time_interval.
  class TimeIntervalDrop < Liquid::Drop
    def initialize(time_interval)
      super()
      @time_interval = time_interval || {}
    end

    def start
      DateTime.parse(@time_interval["start"]) if @time_interval["start"]
    end

    def end
      DateTime.parse(@time_interval["end"]) if @time_interval["end"]
    end
  end
end
