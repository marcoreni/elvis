# frozen_string_literal: true

require "rails_helper"

# Regression coverage for feature/i18n-06-extract-formules: the formules index/new/edit views had
# their hardcoded French <h2> headings replaced with I18n keys
# (views.formules.{index,new,edit}.heading). Same pattern as
# spec/requests/payment_admin_pages_spec.rb — render in both locales, assert on real translated
# copy (unescaped, headings carry apostrophes), guard against a leaked "translation missing"
# marker.
#
# The Formules / EditFormule React trees are covered by the colocated Vitest specs
# (frontend/components/formules/*.test.jsx). formules#show has no hardcoded copy (bare
# react_component mount point) and is not exercised here.
RSpec.describe "Formules pages", type: :request do
  include Devise::Test::IntegrationHelpers

  around do |example|
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
    example.run
    Rails.cache.delete("current_season")
    Rails.cache.delete("current_apps_season")
  end

  let(:admin) do
    FactoryBot.create(:user, email: "formules-spec@example.com", is_admin: true)
  end

  let!(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  let!(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind) }
  let!(:formule) do
    Formule.new(name: "Parcours découverte", number_of_items: 1).tap do |f|
      f.formule_items.build(item: activity_ref)
      f.save!
    end
  end

  before { sign_in admin }

  def unescaped_body
    CGI.unescapeHTML(response.body)
  end

  describe "GET /formules (index)" do
    it "renders in French by default" do
      get formules_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Formules")
    end

    it "renders in English when the locale cookie is set" do
      cookies[:locale] = "en"
      get formules_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Packages")
    end
  end

  describe "GET /formules/new" do
    it "renders the heading in both locales" do
      get new_formule_path
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Créer une formule")

      cookies[:locale] = "en"
      get new_formule_path
      expect(unescaped_body).to include("Create a package")
    end
  end

  describe "GET /formules/:id/edit" do
    it "renders the heading in both locales" do
      get edit_formule_path(formule)
      expect(response).to have_http_status(:ok)
      expect(unescaped_body).to include("Modifier une formule")

      cookies[:locale] = "en"
      get edit_formule_path(formule)
      expect(unescaped_body).to include("Edit a package")
    end
  end

  it "never leaks a raw missing-translation marker on these pages" do
    [formules_path, new_formule_path, edit_formule_path(formule)].each do |path|
      get path
      expect(response.body).not_to include("translation missing")
    end
  end
end
