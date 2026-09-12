# frozen_string_literal: true

require "rails_helper"

# Regression test for a KnownIssues.md entry ("Pre-existing bugs surfaced during Phase 07 P6"):
# RemoveController#get_references (app/controllers/remove_controller.rb) used to check
# `ref.class.respond_to?(:display_name)` - a method no model defines - so it always fell through
# to the raw Ruby class name (e.g. "Room" instead of "salle"/"room"). The companion bug lived in
# ApplicationRecord#display_class_name itself (app/models/application_record.rb): as a *class*
# method, `self` inside it was already the model class, so `self.class.name` returned the literal
# string "Class" for every one of the ~89 models that did not override it with its own hardcoded
# French text.
#
# The fix: RemoveController now calls the real `display_class_name` method, and
# ApplicationRecord#display_class_name delegates to Rails' own i18n-aware
# `self.model_name.human(count:)`, resolving `activerecord.models.<model_i18n_key>` in
# config/locales/{fr,en}.yml.
#
# Note on test approach: GET /references/:classname/:id (RemoveController#get_references) has no
# view template (no app/views/remove/get_references.*), and the action never calls `render`
# itself - it just returns an array. Over a real HTTP request this makes Rails'
# ActionController::ImplicitRender#default_render fall through to `head :no_content` for any
# non-"interactive browser" format (json/xhr), so the endpoint always responds 204 with an empty
# body in this checkout (confirmed both before and after this fix - it is unrelated to the
# display_name bug). Whether some plugin supplies the missing template at runtime in a real
# deployment (see docs/Plugin-*.md's view-path prepending) could not be determined here, since no
# plugins are loaded in this environment (plugins.json absent - see the "no plugins will be
# considered" boot warning). That gap is a separate, undocumented issue and out of scope for this
# fix; flagging it rather than papering over it by adding a `render json:` call the task didn't
# ask for. To still exercise the real method end-to-end without being blocked by that unrelated
# gap, this spec calls RemoveController#get_references directly on a real controller instance
# against real ActiveRecord associations (no stubbing of the method under test), the same way the
# HTTP action itself would be invoked, just without going through the Rack dispatch/render cycle.
RSpec.describe RemoveController do
  shared_examples "resolves the reference's i18n-translated display name" do |locale|
    it "returns the referencing model's activerecord.models.* name in #{locale}" do
      references = I18n.with_locale(locale) { subject.get_references }
      reference = references.find { |ref| ref[:name] == expected_reference_class }

      expect(reference).not_to be_nil
      expect(reference[:display_name]).to eq(I18n.t(expected_i18n_key, locale: locale, count: 1))
      # the old bug's signature: either the literal "Class"/"Classes" (application_record.rb's
      # `self.class.name` mistake) or the raw Ruby class name (remove_controller.rb's
      # `display_name` vs `display_class_name` mistake) - neither should ever show up again.
      expect(reference[:display_name]).not_to eq("Class")
      expect(reference[:display_name]).not_to eq(expected_reference_class)
    end
  end

  def build_controller(object:, destroy_params:)
    described_class.new.tap do |controller|
      controller.instance_variable_set(:@object, object)
      controller.instance_variable_set(:@destroy_params, destroy_params)
    end
  end

  context "with a Location referenced by a Room" do
    let(:location) { Location.create!(label: "Site avec salle liée #{SecureRandom.hex(4)}") }
    let(:expected_reference_class) { "Room" }
    let(:expected_i18n_key) { "activerecord.models.room" }
    let(:subject) { build_controller(object: location, destroy_params: Location.destroy_params) }

    before { Room.create!(label: "Salle liée", location: location) }

    include_examples "resolves the reference's i18n-translated display name", :fr
    include_examples "resolves the reference's i18n-translated display name", :en
  end

  context "with a PaymentMethod referenced by a Payment" do
    let(:payment_method) { PaymentMethod.create!(label: "Chèque #{SecureRandom.hex(4)}") }
    let(:expected_reference_class) { "Payment" }
    let(:expected_i18n_key) { "activerecord.models.payment" }
    let(:subject) { build_controller(object: payment_method, destroy_params: PaymentMethod.destroy_params) }

    before { Payment.create!(payment_method: payment_method, amount: 42) }

    include_examples "resolves the reference's i18n-translated display name", :fr
    include_examples "resolves the reference's i18n-translated display name", :en
  end

  context "with a BandType referenced by a Band" do
    let(:band_type) { BandType.create!(name: "Rock #{SecureRandom.hex(4)}") }
    let(:music_genre) { MusicGenre.create!(name: "Rock #{SecureRandom.hex(4)}") }
    let(:expected_reference_class) { "Band" }
    let(:expected_i18n_key) { "activerecord.models.band" }
    let(:subject) { build_controller(object: band_type, destroy_params: BandType.destroy_params) }

    before { Band.create!(name: "Les Rockeurs", band_type: band_type, music_genre: music_genre) }

    include_examples "resolves the reference's i18n-translated display name", :fr
    include_examples "resolves the reference's i18n-translated display name", :en
  end

  it "has genuinely distinct fr/en copy for the sampled activerecord.models keys" do
    %w[activerecord.models.room activerecord.models.payment activerecord.models.band].each do |key|
      expect(I18n.t(key, locale: "fr", count: 1)).not_to eq(I18n.t(key, locale: "en", count: 1))
    end
  end
end
