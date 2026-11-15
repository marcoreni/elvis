# frozen_string_literal: true

require "rails_helper"

# Regression coverage for docs/KnownIssues.md's "/evaluation_level_ref/new: sidebar highlights
# 'Registrations' instead of the Evaluations section" entry.
#
# Root cause: app/views/partials/_render_menu.erb built each dropdown's `url_parts` from only the
# *last path segment* of its leaves' URLs, and app/views/partials/_render_menu_item.erb lit up a
# section whenever `request.url.end_with?(part)` -- so any page whose URL happens to end in "new"
# (not just /inscriptions/new, the Inscriptions leaf registered under that literal action) matched.
# Fixed by comparing full paths with a path-boundary check (menu_path_active?) instead of a bare
# suffix check, and by giving the "evaluation_parameters" leaf an explicit `related_paths` entry
# for /evaluation_level_ref, since its new/edit pages aren't registered as their own menu item.
RSpec.describe "Navigation menu active-section highlighting", type: :request do
  include Devise::Test::IntegrationHelpers

  # Season.current / Season.current_apps_season cache in Rails.cache, a real FileStore in the
  # test env that DatabaseCleaner's rollback does not touch -- same guard as other request specs
  # touching Season (e.g. spec/requests/absences_controller_spec.rb).
  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "nav-active-section-admin@example.com", is_admin: true)
  end

  let(:season) do
    Season.create!(
      label: "2025-2026",
      start: 2.years.ago, end: 1.year.from_now,
      opening_date_for_applications: 3.years.ago,
      opening_date_for_new_applications: 30.months.ago,
      closing_date_for_applications: 6.months.from_now,
      is_current: true
    )
  end

  before { sign_in admin }

  # The top-level <li> for a side-menu dropdown section, found via the translated caption text in
  # its <span class="nav-label"> (see app/views/partials/_render_menu_item.erb).
  def section_li(body, caption)
    doc = Nokogiri::HTML(body)
    label = doc.at_xpath(
      "//span[@class='nav-label'][normalize-space(text())=#{caption.to_s.inspect}]"
    )
    label&.ancestors("li")&.first
  end

  it "highlights Evaluations, not Inscriptions, on /evaluation_level_ref/new" do
    get new_evaluation_level_ref_path
    expect(response).to have_http_status(:ok)

    evaluations_li = section_li(response.body, I18n.t("menu.evaluations"))
    inscriptions_li = section_li(response.body, I18n.t("menu.inscriptions"))

    expect(evaluations_li).not_to be_nil
    expect(inscriptions_li).not_to be_nil
    expect(evaluations_li[:class]).to include("active")
    expect(inscriptions_li[:class]).not_to include("active")
  end

  it "highlights Evaluations, not Inscriptions, on /evaluation_level_ref/:id/edit" do
    level = EvaluationLevelRef.create!(label: "Intermédiaire", value: 3)

    get edit_evaluation_level_ref_path(level)
    expect(response).to have_http_status(:ok)

    evaluations_li = section_li(response.body, I18n.t("menu.evaluations"))
    inscriptions_li = section_li(response.body, I18n.t("menu.inscriptions"))

    expect(evaluations_li[:class]).to include("active")
    expect(inscriptions_li[:class]).not_to include("active")
  end

  it "still highlights Inscriptions on /activities_applications/new (its own registered leaf)" do
    season

    get new_activities_application_path
    expect(response).to have_http_status(:ok)

    inscriptions_li = section_li(response.body, I18n.t("menu.inscriptions"))
    evaluations_li = section_li(response.body, I18n.t("menu.evaluations"))

    expect(inscriptions_li).not_to be_nil
    expect(inscriptions_li[:class]).to include("active")
    expect(evaluations_li[:class]).not_to include("active")
  end
end
