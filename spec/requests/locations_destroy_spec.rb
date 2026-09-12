# frozen_string_literal: true

require "rails_helper"

# Regression test for a KnownIssues.md entry ("Pre-existing bugs surfaced during Phase 07 P2"):
# LocationsController#destroy used to set flash[:error] to a bare String on the
# destroy-blocked path (a location with dependent rooms raises ActiveRecord::InvalidForeignKey),
# but app/views/locations/index.html.erb and app/views/locations/_form.html.erb both treat
# flash[:error] as an array (`.each`, `&.any?`). Any real destroy-blocked render therefore raised
# a NoMethodError. The fix wraps the string in an array; this spec exercises the actual
# destroy-blocked path end to end and checks the HTML render succeeds.
RSpec.describe "Locations destroy", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "locations-destroy-admin@example.com", is_admin: true) }

  before { sign_in admin }

  it "does not raise and re-renders the index with the flash error when the location has dependent rooms" do
    location = Location.create!(label: "Site avec salle liée #{SecureRandom.hex(4)}")
    Room.create!(label: "Salle liée", location: location)

    expect do
      delete "/locations/#{location.id}"
    end.not_to raise_error

    expect(response).to redirect_to(locations_path)
    expect(flash[:error]).to eq([I18n.t("controllers.locations.destroy.linked_data_error")])

    follow_redirect!
    expect(response).to have_http_status(:ok)
    expect(response.body).to include(CGI.escapeHTML(I18n.t("controllers.locations.destroy.linked_data_error")))
    expect(Location.exists?(location.id)).to be(true)
  end
end
