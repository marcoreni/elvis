# frozen_string_literal: true

require "rails_helper"

# Regression coverage for PaymentHelper.generate_payer_payment_summary_data: the Pack lookup
# (payment_helper.rb:69) referenced a bare `season_id` local that doesn't exist in this method's
# scope -- the method's actual parameter is `season` (a Season object). Raised a NameError on
# every real page load once a student had any activity ("students" non-empty), which is the only
# way execution reaches that line. Exercises that path directly with a real Pack record.
RSpec.describe PaymentHelper do
  describe ".generate_payer_payment_summary_data" do
    let(:location) { Location.create!(label: "Batiment payment helper spec") }
    let(:room) { Room.create!(label: "Salle payment helper spec", location: location) }
    let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
    let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano") }
    let(:season) do
      Season.create!(
        label: "Saison payment helper spec",
        start: 3.days.from_now.beginning_of_day,
        end: 10.days.from_now.end_of_day,
        opening_date_for_applications: 30.days.ago,
        opening_date_for_new_applications: 25.days.ago,
        closing_date_for_applications: 1.day.ago
      )
    end
    let(:time_interval) do
      start_time = (season.start + 1.day).change(hour: 10, min: 0)
      TimeInterval.create!(start: start_time, end: start_time + 1.hour, kind: "c", is_validated: true)
    end
    let(:activity) do
      Activity.create!(time_interval: time_interval, activity_ref: activity_ref, room: room, location: location)
    end
    let(:user) { FactoryBot.create(:user, email: "payment-helper-spec-user@example.com") }
    let!(:student) { Student.create!(user: user, activity: activity) }

    let(:pricing_category) { PricingCategory.create!(name: "Pack piano", is_a_pack: true) }
    let!(:activity_ref_pricing) do
      ActivityRefPricing.create!(
        activity_ref: activity_ref,
        price: 250.0,
        pricing_category: pricing_category,
        from_season: season
      )
    end
    let!(:pack) do
      Pack.create!(user: user, activity_ref_pricing: activity_ref_pricing, season: season, lessons_remaining: 10)
    end

    it "does not raise and includes the season's pack pricing in the returned data" do
      result = nil

      expect { result = described_class.generate_payer_payment_summary_data(user, season) }.not_to raise_error

      pack_entry = result.find { |d| d[:packId] == pack.id }

      expect(pack_entry).not_to be_nil
      expect(pack_entry[:studentId]).to eq(user.id)
      expect(pack_entry[:due_total]).to eq(activity_ref_pricing.price)
      expect(pack_entry[:unitPrice]).to eq(activity_ref_pricing.price)
      expect(pack_entry[:discountedTotal]).to eq(activity_ref_pricing.price)
      expect(pack_entry[:activity]).to eq(
        "Pack de #{user.first_name} #{user.last_name} pour #{activity_ref.label} (#{activity_ref.kind})"
      )
    end
  end
end
