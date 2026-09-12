# frozen_string_literal: true

require "rails_helper"

# Regression coverage for a KnownIssues.md entry ("ActivityAssignedMailer / ApplicationMailer
# #notify_new_application file-based views call undefined LiquidDrops::ApplicationDrop methods"):
# app/views/activity_assigned_mailer/activity_assigned.html.erb and
# app/views/application_mailer/notify_new_application.{html.erb,mjml} call
# @application.user.first_name / .last_name / @application.season.label, but
# LiquidDrops::ApplicationDrop only defined flattened accessors (first_name/last_name/
# season_label) -- no `user`/`season` methods -- so those view calls raised NoMethodError
# whenever the file-based view was actually rendered (i.e. no DB NotificationTemplate override).
#
# Fix adds `user`/`season` accessors returning small LiquidDrops::UserDrop/SeasonDrop objects
# that respond to `.first_name`/`.last_name` and `.label` respectively.
RSpec.describe LiquidDrops::ApplicationDrop, type: :mailer do
  # Shape mirrors what ActivityAssignedMailer#activity_assigned and
  # ApplicationMailer#notify_new_application actually pass in
  # (application.as_json(include: { user: {...}, season: {} })).
  let(:hash) do
    {
      "id" => 42,
      "user_id" => 7,
      "user" => {
        "id" => 7,
        "email" => "student@example.com",
        "first_name" => "Camille",
        "last_name" => "Martin",
        "birthday" => "2000-01-01",
        "adherent_number" => "AD-123"
      },
      "season" => {
        "id" => 3,
        "label" => "2025-2026",
        "start" => "2025-09-01",
        "end" => "2026-08-31"
      }
    }
  end

  subject(:drop) { described_class.new(hash) }

  it "does not raise on @application.user.first_name / .last_name (the view call sites)" do
    expect { drop.user.first_name }.not_to raise_error
    expect { drop.user.last_name }.not_to raise_error
    expect(drop.user.first_name).to eq("Camille")
    expect(drop.user.last_name).to eq("Martin")
  end

  it "does not raise on @application.season.label (the view call site)" do
    expect { drop.season.label }.not_to raise_error
    expect(drop.season.label).to eq("2025-2026")
  end

  it "still supports the pre-existing flattened accessors (not a regression)" do
    expect(drop.first_name).to eq("Camille")
    expect(drop.last_name).to eq("Martin")
    expect(drop.season_label).to eq("2025-2026")
  end

  it "the user drop also answers adherent_number/adherent_number? (used by the shared users_info_partial)" do
    expect(drop.user.adherent_number).to eq("AD-123")
    expect(drop.user.adherent_number?).to be(true)
  end

  context "with a missing nested user/season hash" do
    let(:hash) { { "id" => 1 } }

    it "returns drops that answer nil/false instead of raising" do
      expect { drop.user.first_name }.not_to raise_error
      expect(drop.user.first_name).to be_nil
      expect(drop.user.adherent_number?).to be(false)
      expect(drop.season.label).to be_nil
    end
  end
end
