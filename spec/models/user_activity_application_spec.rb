# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the Lint/DuplicateMethods cleanup on User#activity_application:
# the model used to define this method twice (find_by(season: Season.current) and,
# further down, find_by(season_id: Season.current.id)) -- the second, functionally
# equivalent definition silently won and the first was dead code. The dead duplicate
# was removed; this spec pins down that the surviving method still resolves the
# ActivityApplication for the current season.
RSpec.describe User, type: :model do
  let(:user) { FactoryBot.create(:user, email: "activity-application-spec@example.com") }
  let(:current_season) do
    Season.create!(
      label: "current", start: 1.year.ago, end: 1.year.from_now, is_current: true,
      opening_date_for_applications: 2.years.ago, opening_date_for_new_applications: 2.years.ago,
      closing_date_for_applications: 6.months.ago
    )
  end
  let(:other_season) do
    Season.create!(
      label: "other", start: 3.years.ago, end: 2.years.ago, is_current: false,
      opening_date_for_applications: 4.years.ago, opening_date_for_new_applications: 4.years.ago,
      closing_date_for_applications: 3.years.ago
    )
  end

  before do
    Rails.cache.delete("current_season")
  end

  it "returns the activity application for the current season" do
    expected = ActivityApplication.create!(
      user: user, season: current_season, activity_application_status: ActivityApplicationStatus::TREATMENT_PENDING
    )
    ActivityApplication.create!(
      user: user, season: other_season, activity_application_status: ActivityApplicationStatus::TREATMENT_PENDING
    )

    expect(user.activity_application).to eq(expected)
  end

  it "returns nil when the user has no application for the current season" do
    current_season
    ActivityApplication.create!(
      user: user, season: other_season, activity_application_status: ActivityApplicationStatus::TREATMENT_PENDING
    )

    expect(user.activity_application).to be_nil
  end
end
