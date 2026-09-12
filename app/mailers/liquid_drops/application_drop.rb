# frozen_string_literal: true

require_relative "user_drop"
require_relative "season_drop"

module LiquidDrops
  class ApplicationDrop < Liquid::Drop
    def initialize(application)
      @application = application
    end

    def id
      @application["id"]
    end

    def user_id
      @application["user_id"]
    end

    # Views (e.g. activity_assigned_mailer/activity_assigned.html.erb,
    # application_mailer/notify_new_application.{html.erb,mjml}) call @application.user.first_name /
    # .last_name directly, rather than this drop's own flattened first_name/last_name accessors.
    def user
      UserDrop.new(@application["user"])
    end

    # Views call @application.season.label directly, rather than this drop's own flattened
    # season_label accessor.
    def season
      SeasonDrop.new(@application["season"])
    end

    def email
      @application["user"]["email"]
    end

    def first_name
      @application["user"]["first_name"]
    end

    def last_name
      @application["user"]["last_name"]
    end

    def birthday
      @application["user"]["birthday"]
    end

    def adherent_number
      @application["user"]["adherent_number"]
    end

    def start
      @application["season"]["start"]
    end

    def end
      @application["season"]["end"]
    end

    def season_label
      @application["season"]["label"]
    end

    def total_all_due_payments
      user = @application["user"]
      payment_schedules = user["payment_schedules"] || []

      due_payments = payment_schedules.map { |schedule| schedule["due_payments"] }.flatten
      due_payments.sum { |dp| dp["amount"].to_f }
    end

    def total_pending_due_payments
      user = @application["user"]
      payment_schedules = user["payment_schedules"] || []

      due_payments = payment_schedules.map { |schedule| schedule["due_payments"] }.flatten
      pending_due_payments = due_payments.select do |dp|
        dp["due_payment_status_id"] != DuePaymentStatus::PAID_ID
      end
      pending_due_payments.sum { |dp| dp["amount"].to_f }
    end
  end
end
