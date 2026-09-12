# frozen_string_literal: true

module LiquidDrops
  # Wraps an application's nested "season" hash so views that call @application.season.label
  # (rather than ApplicationDrop's own flattened season_label accessor) resolve correctly.
  # See ApplicationDrop#season.
  class SeasonDrop < Liquid::Drop
    def initialize(season)
      super()
      @season = season || {}
    end

    def id
      @season["id"]
    end

    def label
      @season["label"]
    end

    def start
      @season["start"]
    end

    def end
      @season["end"]
    end
  end
end
