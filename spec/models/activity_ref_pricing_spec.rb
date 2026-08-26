# spec/models/activity_ref_pricing_spec.rb

require 'rails_helper'

RSpec.describe ActivityRefPricing, type: :model do
  describe '#overlaps?' do
    def build_season(start_year)
      Season.create!(
        label: "#{start_year}-#{start_year + 1}",
        start: DateTime.new(start_year, 9, 1),
        end: DateTime.new(start_year + 1, 6, 30),
        opening_date_for_applications: DateTime.new(start_year, 7, 1),
        opening_date_for_new_applications: DateTime.new(start_year, 8, 1),
        closing_date_for_applications: DateTime.new(start_year, 10, 1)
      )
    end

    # Three consecutive, non-overlapping seasons — overlaps? compares by season start/end dates,
    # not by id, but the ids below are still referenced for readability against the original
    # 1/2/3 season numbering this spec used before it hardcoded ids that didn't exist in the test
    # database (see docs/CodeReviewAgentNotes.md).
    let(:season1) { build_season(2020) }
    let(:season2) { build_season(2021) }
    let(:season3) { build_season(2022) }

    let(:existing_pricing) do
      ActivityRefPricing.create(
        activity_ref_id: 15,
        from_season_id: season2.id,
        to_season_id: season2.id,
        price: 420,
        pricing_category_id: 5
      )
    end

    context 'when there is an overlap' do
      let(:overlapping_pricing) do
        described_class.new(
          activity_ref_id: 15,
          from_season_id: season1.id,
          to_season_id: season3.id,
          price: 420,
          pricing_category_id: 5
        )
      end

      it 'returns true' do
        expect(overlapping_pricing.overlaps?(existing_pricing)).to be true
      end
    end

    context 'when there is no overlap' do
      let(:non_overlapping_pricing) do
        described_class.new(
          activity_ref_id: 15,
          from_season_id: season1.id,
          to_season_id: season1.id,
          price: 420,
          pricing_category_id: 5
        )
      end

      it 'returns true' do
        expect(non_overlapping_pricing.overlaps?(existing_pricing)).to be false
      end
    end

    context 'when there is overlap' do
      let(:non_overlapping_pricing) do
        described_class.new(
          activity_ref_id: 15,
          from_season_id: season2.id,
          to_season_id: season3.id,
          price: 420,
          pricing_category_id: 5
        )
      end

      it 'returns true' do
        expect(non_overlapping_pricing.overlaps?(existing_pricing)).to be true
      end
    end

    context 'when the two ranges share only a boundary season (regression)' do
      # season2..season3 vs season1..season2: they only share season2, but sharing even one
      # season means the same activity/pricing category would be priced twice for it.
      let(:pricing) do
        described_class.new(
          activity_ref_id: 15,
          from_season_id: season2.id,
          to_season_id: season3.id,
          price: 420,
          pricing_category_id: 5
        )
      end
      let(:other_pricing) do
        described_class.new(
          activity_ref_id: 15,
          from_season_id: season1.id,
          to_season_id: season2.id,
          price: 420,
          pricing_category_id: 5
        )
      end

      it 'returns true' do
        expect(pricing.overlaps?(other_pricing)).to be true
      end
    end

    context 'when self has no end season (open-ended)' do
      let(:open_ended_pricing) do
        described_class.new(
          activity_ref_id: 15,
          from_season_id: season1.id,
          to_season_id: nil,
          price: 420,
          pricing_category_id: 5
        )
      end

      it 'overlaps any pricing starting after it, since it never ends' do
        expect(open_ended_pricing.overlaps?(existing_pricing)).to be true
      end

      it 'does not overlap a pricing that ends before it starts' do
        earlier_pricing = described_class.new(
          activity_ref_id: 15,
          from_season_id: season1.id,
          to_season_id: season1.id,
          price: 420,
          pricing_category_id: 5
        )
        open_ended_from_season2 = described_class.new(
          activity_ref_id: 15,
          from_season_id: season2.id,
          to_season_id: nil,
          price: 420,
          pricing_category_id: 5
        )

        expect(open_ended_from_season2.overlaps?(earlier_pricing)).to be false
      end
    end
  end
end
