# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "Background job status/error text ... always
# renders in the default locale": ApplicationJob now has an around_perform that reads a `locale:`
# keyword argument off the job's arguments and wraps the whole perform in I18n.with_locale, and
# CsvImporterJob accepts/forwards that argument (its enqueue site,
# ActivitiesApplicationsController#create_import_csv, now passes `locale: I18n.locale.to_s`).
#
# Uses a tiny stub import handler (mirrors ActivityApplications::TesImportHandler's
# check_valid_headers/handle_row contract) instead of the real TES handler, so this test doesn't
# depend on the TES CSV schema/User-merging logic -- it only needs to reach the "completed" status
# line, which is where the translated text is asserted.
class CsvImporterJobLocaleSpecHandler
  def check_valid_headers(headers)
    headers == %w[a b]
  end

  def handle_row(_row, _current_line)
    { ignored_activities: 0, activity_applications_created: 1, errors: [] }
  end
end

RSpec.describe CsvImporterJob do
  let(:file_path) { Rails.root.join("tmp", "csv_importer_job_locale_spec_#{SecureRandom.uuid}.csv").to_s }

  before { File.write(file_path, "a;b\n1;2\n") }
  after { File.delete(file_path) if File.exist?(file_path) }

  def run_job(**kwargs)
    job = described_class.new(file_path, "CsvImporterJobLocaleSpecHandler", **kwargs)
    job.perform_now
    job
  end

  def expected_completed_message(locale)
    I18n.t(
      "jobs.csv_importer.completed",
      count: 1, created: 1, ignored: 0, locale: locale
    )
  end

  it "renders the completed status text in English when locale: \"en\" is passed" do
    job = run_job(locale: "en")

    expect(job.status[:step]).to eq(expected_completed_message(:en))
  end

  it "renders the completed status text in French when locale: \"fr\" is passed" do
    job = run_job(locale: "fr")

    expect(job.status[:step]).to eq(expected_completed_message(:fr))
  end

  it "still resolves French by default when no locale argument is given (no behavior change for existing callers)" do
    job = run_job

    expect(job.status[:step]).to eq(expected_completed_message(:fr))
  end

  it "the fr/en completed messages are genuinely distinct (catches a copy-paste locale bug)" do
    expect(expected_completed_message(:fr)).not_to eq(expected_completed_message(:en))
  end
end
