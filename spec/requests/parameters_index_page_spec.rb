# frozen_string_literal: true

require "rails_helper"

# Regression coverage for feature/i18n-06-parameters-lot-f: the /parameters landing page had its
# last hardcoded French strings extracted to I18n keys —
#
#   * ParametersController#set_base_parameters — the 7 setting-cards' title:/text: strings →
#     t("views.parameters.index.cards.<slug>.{title,text}")
#     (slugs: school, languages, emails, csv, notifications, teachers, packages)
#   * app/views/parameters/index.html.erb — the section <h3> went from `key.to_s.humanize` to
#     t("views.parameters.index.sections.#{key}", default: key.to_s.humanize), where `key` is the
#     Ruby symbol :général / :personnalisation.
#
# Same pattern as spec/requests/formules_pages_spec.rb / payment_admin_pages_spec.rb — render in
# both locales, assert on real translated copy (unescaped, the school card text carries an
# apostrophe-free "école:" but other cards carry apostrophes ERB escapes), guard against a leaked
# "translation missing" marker and against the raw `:général` symbol leaking into the <h3>.
RSpec.describe "Parameters index page", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "parameters-index-spec@example.com", is_admin: true)
  end

  before { sign_in admin }

  def unescaped_body
    CGI.unescapeHTML(response.body)
  end

  def section_headings
    unescaped_body.scan(%r{<h3 class="font-bold text-dark">([^<]+)</h3>}).flatten
  end

  def card_titles
    unescaped_body.scan(%r{<h5>([^<]+)</h5>}).flatten
  end

  context "in French (default locale)" do
    before { get "/parameters" }

    it "renders successfully" do
      expect(response).to have_http_status(:ok)
    end

    it "shows the translated page + section headings" do
      expect(unescaped_body)
        .to include("Paramètres")
        .and include("Votre école")
        .and include("Définissez les informations générales de votre école: nom, adresse postale, etc.")
        .and include("Formules")
        .and include("Activez ou désactivez l'affichage des formules.")
    end

    it "renders exactly the two section <h3>s, in order" do
      expect(section_headings).to eq(%w[Général Personnalisation])
    end

    it "renders all 7 setting-card <h5> titles" do
      ["Votre école", "Langues", "Emails", "Exports CSV", "Notifications", "Professeurs", "Formules"].each do |title|
        expect(card_titles).to include(title)
      end
    end

    it "renders all 7 setting-card texts verbatim" do
      [
        "Définissez les informations générales de votre école: nom, adresse postale, etc.",
        "Choisissez la langue par défaut de l'installation et les langues proposées aux utilisateurs.",
        "Paramétrez votre serveur d'envoi de mails, l'adresse de l'expéditeur et vos destinataires.",
        "Paramétrez vos exports CSV.",
        "Paramétrez et modifiez vos templates emails.",
        "Gérez les permissions au planning et les informations affichées à l'élève.",
        "Activez ou désactivez l'affichage des formules."
      ].each { |text| expect(unescaped_body).to include(text) }
    end

    it "does not leak the raw :général / :personnalisation symbol into the <h3>" do
      expect(unescaped_body).not_to include(":général")
      expect(unescaped_body).not_to include(":personnalisation")
      expect(unescaped_body).not_to match(/<h3 class="font-bold text-dark">\s*général/)
      expect(response.body).not_to match(/translation missing/i)
    end
  end

  context "in English (?locale=en cookie)" do
    before do
      cookies[:locale] = "en"
      get "/parameters"
    end

    it "renders successfully" do
      expect(response).to have_http_status(:ok)
    end

    it "shows the translated page + section headings" do
      expect(unescaped_body)
        .to include("Settings")
        .and include("Your school")
        .and include("General")
        .and include("Customization")
        .and include("Packages")
        .and include("Enable or disable the display of packages.")
    end

    it "renders exactly the two section <h3>s, in order" do
      expect(section_headings).to eq(%w[General Customization])
    end

    it "renders all 7 setting-card <h5> titles" do
      ["Your school", "Languages", "Emails", "CSV exports", "Notifications", "Teachers", "Packages"].each do |title|
        expect(card_titles).to include(title)
      end
    end

    it "renders all 7 setting-card texts" do
      [
        "Set your school's general information: name, postal address, etc.",
        "Choose the installation's default language and the languages offered to users.",
        "Configure your outgoing mail server, the sender address and your recipients.",
        "Configure your CSV exports.",
        "Configure and edit your email templates.",
        "Manage schedule permissions and the information shown to the student.",
        "Enable or disable the display of packages."
      ].each { |text| expect(unescaped_body).to include(text) }
    end

    it "never leaks a raw missing-translation marker" do
      expect(response.body).not_to match(/translation missing/i)
    end
  end
end
