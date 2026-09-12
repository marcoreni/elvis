# frozen_string_literal: true

require "rails_helper"

# Checkpoint coverage for Phase 07 P6 (feat/i18n-p6-backend-strings): 10 mailer classes had their
# hardcoded French `subject:` string replaced with `default_i18n_subject(name: ...)`, which relies
# on ActionMailer's flat `<mailer_name>.<action>.subject` i18n convention (config/locales/*.yml,
# top-level nodes -- see the comment above `activity_accepted_mailer:` in en.yml/fr.yml). This is
# a lean checkpoint on 2 of the 10 mailers, not full per-mailer coverage: it exists to prove
# `default_i18n_subject` is actually wired to real translations rather than silently falling back
# to ActionMailer's humanized-action-name default (e.g. "Reminder email" / "Upcoming payment" with
# no school name and no locale awareness -- which is what you'd see if the i18n key were missing
# or misspelled).
#
# AdhesionMailer#reminder_email is picked because its whole action only needs a User (no Activity/
# Season object graph), and its view got extracted too (app/views/adhesion_mailer/reminder_email.html.erb),
# so this also exercises the view-side i18n keys as a bonus.
#
# UpcomingPaymentMailer#upcoming_payment is picked as a *second, independent* wiring proof, and
# specifically to sidestep the heavier fixture graph several of the other 8 mailers' extracted
# views need (a real ActivityApplication/Activity/Season). See spec/mailers/application_drop_spec.rb
# and spec/mailers/application_mailer_notify_new_application_spec.rb for coverage of
# `LiquidDrops::ApplicationDrop#user`/`#season` (previously missing -- the fixed KnownIssues.md
# entry "ActivityAssignedMailer / ApplicationMailer#notify_new_application file-based views call
# undefined LiquidDrops::ApplicationDrop methods" has been removed now that this is fixed).
# UpcomingPaymentMailer has no file-based view at all (only a DB-driven NotificationTemplate in
# production); a minimal stub NotificationTemplate row is seeded here purely so `mail()` can
# render *something* -- the row's body is irrelevant, only `subject` is under test.
RSpec.describe "P6 mailer subject i18n", type: :mailer do
  let!(:school) { School.create!(name: "École de Test") }
  let(:user) { FactoryBot.create(:user, email: "p6-mailer-spec@example.com", first_name: "Jean", last_name: "Dupont") }

  describe AdhesionMailer do
    # `.subject` must be forced *inside* the with_locale block: AdhesionMailer.with(...).reminder_email
    # returns a lazy MessageDelivery, and the mailer action (where default_i18n_subject reads
    # I18n.locale) only actually runs the first time something is called on it -- if that happened
    # outside the block, it would run under whatever locale is current by then, not `locale`.
    def subject_for(locale)
      I18n.with_locale(locale) { AdhesionMailer.with(user: user).reminder_email.subject }
    end

    it "resolves the French subject via default_i18n_subject, not a humanized fallback" do
      expect(subject_for(:fr)).to eq(I18n.t("adhesion_mailer.reminder_email.subject", name: school.name, locale: :fr))
    end

    it "resolves the English subject via default_i18n_subject, not a humanized fallback" do
      expect(subject_for(:en)).to eq(I18n.t("adhesion_mailer.reminder_email.subject", name: school.name, locale: :en))
    end

    it "has genuinely distinct fr/en subject copy (catches a copy-paste locale bug)" do
      expect(subject_for(:fr)).not_to eq(subject_for(:en))
    end
  end

  describe UpcomingPaymentMailer do
    # No production NotificationTemplate exists for this action in a fresh test DB, so `mail()`
    # would raise ActionView::MissingTemplate before we ever get to `subject`. The body's content
    # is not under test -- only that rendering succeeds so `subject` becomes reachable.
    before do
      NotificationTemplate.find_or_create_by!(path: "upcoming_payment_mailer/upcoming_payment") do |t|
        t.format = "html"
        t.handler = "erb"
        t.partial = false
        t.locale = nil
        t.body = "stub body for i18n subject checkpoint"
      end
    end

    let(:season_stub) { Struct.new(:label).new("2025-2026") }

    def subject_for(locale)
      I18n.with_locale(locale) do
        UpcomingPaymentMailer.upcoming_payment(user, season_stub, [{ due_total: 12.5 }]).subject
      end
    end

    def expected_subject(locale)
      I18n.t("upcoming_payment_mailer.upcoming_payment.subject", name: school.name, locale: locale)
    end

    it "resolves the French subject via default_i18n_subject, not a humanized fallback" do
      expect(subject_for(:fr)).to eq(expected_subject(:fr))
    end

    it "resolves the English subject via default_i18n_subject, not a humanized fallback" do
      expect(subject_for(:en)).to eq(expected_subject(:en))
    end

    it "has genuinely distinct fr/en subject copy (catches a copy-paste locale bug)" do
      expect(subject_for(:fr)).not_to eq(subject_for(:en))
    end
  end
end
