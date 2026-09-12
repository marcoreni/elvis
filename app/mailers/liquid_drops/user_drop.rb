# frozen_string_literal: true

module LiquidDrops
  # Wraps an application's nested "user" hash so views that call @application.user.first_name /
  # .last_name (rather than ApplicationDrop's own flattened first_name/last_name accessors)
  # resolve correctly. See ApplicationDrop#user.
  class UserDrop < Liquid::Drop
    def initialize(user)
      super()
      @user = user || {}
    end

    def id
      @user["id"]
    end

    def email
      @user["email"]
    end

    def first_name
      @user["first_name"]
    end

    def last_name
      @user["last_name"]
    end

    def adherent_number
      @user["adherent_number"]
    end

    def adherent_number?
      @user["adherent_number"].present?
    end
  end
end
