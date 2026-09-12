# frozen_string_literal: true

module LiquidDrops
  # Wraps an activity's nested "activity_ref" hash so views that call @activity.activity_ref.label
  # directly (rather than ActivityDrop's own flattened label/display_name accessors) resolve
  # correctly. See ActivityDrop#activity_ref.
  class ActivityRefDrop < Liquid::Drop
    def initialize(activity_ref)
      super()
      @activity_ref = activity_ref || {}
    end

    def id
      @activity_ref["id"]
    end

    def label
      @activity_ref["label"]
    end

    def display_name
      @activity_ref["display_name"]
    end
  end
end
