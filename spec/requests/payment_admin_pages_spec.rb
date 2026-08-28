# frozen_string_literal: true

require "rails_helper"

# Regression coverage for feature/i18n-06-extract-payments: the payment_method / payment_statuses
# admin CRUD screens, payments#index and failed_payment_imports#index had their hardcoded French
# replaced with I18n keys. Same pattern as spec/requests/evaluation_pages_spec.rb — render in both
# locales, assert on real translated copy (unescaped, since several headings carry apostrophes /
# "?" that ERB escapes), guard against a leaked "translation missing" marker.
#
# Out of scope for this branch (deferred to a follow-up payments branch): the generalPayments/*
# and userPayments/* React trees (~100 strings), and the parameters/Payments/* screens (belong to
# the `parameters` domain). payment_schedule/show.html.erb is intentionally left in French — it is
# a billing/"échéancier" document, same category as the documented payments/bill.html.erb
# exception.
RSpec.describe "Payment admin pages", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "payment-admin-spec@example.com", is_admin: true)
  end

  let!(:payment_method) { PaymentMethod.create!(label: "Virement test", built_in: false) }
  let!(:payment_status) { PaymentStatus.create!(label: "Statut test", color: "#123456", built_in: false) }

  before { sign_in admin }

  def unescaped_body
    CGI.unescapeHTML(response.body)
  end

  describe "GET /payment_method (index)" do
    it "renders in French by default" do
      get payment_method_index_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body)
        .to include("Moyens de paiement")
        .and include("Créer un moyen de paiement")
        .and include("Est spécial")
        .and include("A crédit")
    end

    it "renders in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get payment_method_index_path
      expect(unescaped_body)
        .to include("Payment methods")
        .and include("Create a payment method")
        .and include("Is special")
    end
  end

  describe "GET /payment_method/new" do
    it "renders in both locales" do
      get new_payment_method_path
      expect(unescaped_body).to include("Création d'une méthode de paiement")

      cookies[:locale] = "en"
      get new_payment_method_path
      expect(unescaped_body).to include("Creating a payment method")
    end
  end

  describe "GET /payment_method/:id/edit" do
    it "renders in both locales" do
      get edit_payment_method_path(payment_method)
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Modification d'une méthode de paiement")

      cookies[:locale] = "en"
      get edit_payment_method_path(payment_method)
      expect(unescaped_body).to include("Editing a payment method")
    end
  end

  describe "GET /payment_statuses (index)" do
    it "renders in both locales" do
      get payment_statuses_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Statuts de paiement").and include("Couleur")

      cookies[:locale] = "en"
      get payment_statuses_path
      expect(unescaped_body).to include("Payment statuses").and include("Color")
    end
  end

  describe "GET /payment_statuses/new + /:id/edit" do
    it "renders new in both locales" do
      get new_payment_status_path
      expect(unescaped_body).to include("Nouveau statut de paiement")

      cookies[:locale] = "en"
      get new_payment_status_path
      expect(unescaped_body).to include("New payment status")
    end

    it "renders edit in both locales" do
      get edit_payment_status_path(payment_status)
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Modification d'un statut de paiement")

      cookies[:locale] = "en"
      get edit_payment_status_path(payment_status)
      expect(unescaped_body).to include("Editing a payment status")
    end
  end

  describe "GET /payments (index)" do
    it "renders the heading in both locales" do
      get payments_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Suivi des paiements")

      cookies[:locale] = "en"
      get payments_path
      expect(unescaped_body).to include("Payment tracking")
    end
  end

  describe "GET /payments/failed_imports" do
    it "renders the heading in both locales" do
      get "/payments/failed_imports"
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Liste des imports de paiements ratés")

      cookies[:locale] = "en"
      get "/payments/failed_imports"
      expect(unescaped_body).to include("Failed payment imports")
    end
  end

  it "never leaks a raw missing-translation marker on any of these pages" do
    [
      payment_method_index_path,
      new_payment_method_path,
      edit_payment_method_path(payment_method),
      payment_statuses_path,
      new_payment_status_path,
      edit_payment_status_path(payment_status),
      payments_path,
      "/payments/failed_imports"
    ].each do |path|
      get path
      expect(response.body).not_to include("translation missing")
    end
  end
end
