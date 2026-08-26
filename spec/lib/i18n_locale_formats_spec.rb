require "rails_helper"

RSpec.describe "I18n custom date/time formats" do
  # Regression test for PR #2 finding #1: config/locales/en.yml used to be a stub, so any
  # I18n.l/I18n.localize call with one of these custom format keys raised
  # I18n::MissingTranslationData as soon as a user's locale was :en (e.g. app/models/season.rb,
  # app/views/students/index.html.erb). See docs/I18n-PR2-Review-Findings.md.
  %i[date_month_concise long_date day short_time].each do |format|
    it "formats time.formats.#{format} in :en without raising" do
      expect { I18n.l(Time.zone.now, format: format, locale: :en) }.not_to raise_error
    end
  end

  it "formats date.formats.date_month_concise in :en without raising" do
    expect { I18n.l(Time.zone.now.to_date, format: :date_month_concise, locale: :en) }.not_to raise_error
  end

  it "falls back to :fr for a key that only exists there, instead of raising" do
    expect(I18n.fallbacks[:en]).to eq([:en, :fr])
  end
end
