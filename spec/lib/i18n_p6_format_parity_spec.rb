# frozen_string_literal: true

require "rails_helper"

# Checkpoint coverage for Phase 07 P6 (feat/i18n-p6-backend-strings), area I: date/time format
# parity (`date.formats.long_date` / `time.formats.long_date`) and currency-locale-file parity
# (`number.currency.format`), added to both config/locales/fr.yml and en.yml.
#
# The currency piece is the more interesting assertion: this app always bills in EUR regardless
# of UI language (see the comment above `number:` in en.yml), so `number_to_currency` in the
# English locale is deliberately expected to still render "1 234,50 €" (French grouping/decimal
# convention, € symbol) -- NOT fall back to rails-i18n's stock USD-formatted en.yml default
# ("$1,234.50"). A dropped override would silently regress to that fallback rather than raise, so
# this has to assert on the literal rendered string.
RSpec.describe "P6 date/currency format locale parity" do
  include ActionView::Helpers::NumberHelper

  let(:date) { Date.new(2026, 9, 5) }
  let(:time) { Time.utc(2026, 9, 5, 10, 30) }

  describe "date.formats.long_date" do
    it "renders day-before-month order in French" do
      expect(I18n.l(date, format: :long_date, locale: :fr)).to eq("5 septembre 2026")
    end

    it "renders month-before-day order in English" do
      expect(I18n.l(date, format: :long_date, locale: :en)).to eq("September 5, 2026")
    end
  end

  describe "time.formats.long_date" do
    it "renders day-before-month order in French" do
      expect(I18n.l(time, format: :long_date, locale: :fr)).to eq("5 septembre 2026")
    end

    it "renders month-before-day order in English" do
      expect(I18n.l(time, format: :long_date, locale: :en)).to eq("September 5, 2026")
    end
  end

  describe "number.currency.format" do
    it "renders French-convention EUR formatting in the fr locale" do
      expect(number_to_currency(1234.5, locale: :fr)).to eq("1 234,50 €")
    end

    it "renders the SAME French-convention EUR formatting in the en locale (deliberately not USD)" do
      expect(number_to_currency(1234.5, locale: :en)).to eq("1 234,50 €")
    end

    it "does not fall back to rails-i18n's stock USD unit for English" do
      expect(number_to_currency(1234.5, locale: :en)).not_to include("$")
    end
  end
end
