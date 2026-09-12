# frozen_string_literal: true

module LiquidDrops
  class PaymentDrop < Liquid::Drop
    # rubocop:disable Lint/MissingSuper -- see app/mailers/liquid_drops/activity_drop.rb: skipping
    # Liquid::Drop#initialize's @context = nil is harmless, Liquid sets drop.context= itself.
    def initialize(payment_schedule)
      @payment_data = payment_schedule
    end
    # rubocop:enable Lint/MissingSuper

    def payment_schedule_id
      @payment_data["id"]
    end

    def payable_id
      @payment_data["payable_id"]
    end

    def payable_type
      @payment_data["payable_type"]
    end

    def location_id
      @payment_data["location_id"]
    end

    def season_of_payment
      Season.find(@payment_data["season_id"]).label
    end
  end
end
