# frozen_string_literal: true

require "rails_helper"

# Checkpoint coverage for Phase 07 P6 (feat/i18n-p6-backend-strings), area G: Formule's custom
# `validate_number_of_items` validation used to call `errors.add` with a hardcoded French string
# built at validation time; it now calls `errors.add(:attr, :symbol, **interpolations)` and relies
# on `activerecord.errors.models.formule.attributes.*` in config/locales/{fr,en}.yml to render the
# actual message (see git diff 810cb1c0..HEAD -- app/models/formule.rb). This is a symbol-message
# regression risk specifically: if the locale key were missing, Rails would silently fall back to
# ActiveModel's generic default ("is invalid") or humanize the symbol, not raise -- so this has to
# assert on the literal resolved copy, not just "an error is present".
#
# No FactoryBot factory exists for Formule (see CLAUDE.md) -- built via the documented pattern of
# `formule_items.build(item: activity_ref)` + `save!`.
RSpec.describe Formule, type: :model do
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano") }

  describe "number_of_items exceeding available activities" do
    subject(:formule) do
      Formule.new(name: "Formule Test", number_of_items: 2).tap do |f|
        f.formule_items.build(item: activity_ref)
        f.valid?
      end
    end

    def expected_exceeds_message(locale)
      I18n.t(
        "activerecord.errors.models.formule.attributes.number_of_items.exceeds_available_activities",
        count: 1, locale: locale
      )
    end

    it "renders the French locale message with the available-activities count interpolated" do
      I18n.with_locale(:fr) do
        formule.valid?
        expect(formule.errors[:number_of_items]).to include(expected_exceeds_message(:fr))
      end
    end

    it "renders the English locale message with the available-activities count interpolated" do
      I18n.with_locale(:en) do
        formule.valid?
        expect(formule.errors[:number_of_items]).to include(expected_exceeds_message(:en))
      end
    end

    it "does not fall back to a raw/humanized symbol" do
      formule.valid?
      expect(formule.errors[:number_of_items].join).not_to match(/exceeds.available.activities/i)
    end
  end

  describe "with no formule_items at all" do
    subject(:formule) { Formule.new(name: "Formule Vide", number_of_items: 1) }

    it "renders the French base error for a package with no activities" do
      I18n.with_locale(:fr) do
        formule.valid?
        expect(formule.errors[:base]).to include(
          I18n.t("activerecord.errors.models.formule.attributes.base.at_least_one_activity", locale: :fr)
        )
      end
    end

    it "renders the English base error for a package with no activities" do
      I18n.with_locale(:en) do
        formule.valid?
        expect(formule.errors[:base]).to include(
          I18n.t("activerecord.errors.models.formule.attributes.base.at_least_one_activity", locale: :en)
        )
      end
    end
  end

  it "saves successfully when number_of_items is within the available activities" do
    formule = Formule.new(name: "Formule Valide", number_of_items: 1)
    formule.formule_items.build(item: activity_ref)

    expect(formule.save).to be(true)
  end
end
