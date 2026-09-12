# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md "Pre-existing bugs surfaced during Phase 07 P2"
# bullet: app/views/rooms/{new,edit}.html.erb passed hardcoded French strings
# (title: "Localisation" / "Activités" / 'Image') straight through as react_component props,
# bypassing I18n entirely -- so an English-locale user still saw French labels on those React-
# mounted fields. The views now resolve those props via views.rooms.{new,edit}.*_title.
#
# react_component (react-rails) serializes props to JSON into the data-react-props attribute,
# HTML-escaping the markup; CGI.unescapeHTML turns that back into plain JSON text so we can assert
# on the exact prop value landing in the rendered tag.
RSpec.describe "Rooms i18n react_component props", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "rooms-i18n-admin@example.com", is_admin: true) }
  let(:location) { Location.create!(label: "Site Rooms i18n spec") }
  let(:room) { Room.create!(label: "Salle Rooms i18n spec", location: location) }

  before { sign_in admin }

  def react_props_body
    CGI.unescapeHTML(response.body)
  end

  %w[fr en].each do |lng|
    context "in #{lng}" do
      before { cookies[:locale] = lng }

      it "GET /rooms/:location_id/new passes the localized location/activities titles" do
        get "/rooms/#{location.id}/new"
        expect(response).to have_http_status(:ok)

        body = react_props_body
        expect(body).to include(%("title":"#{I18n.t('views.rooms.new.location_title', locale: lng)}"))
        expect(body).to include(%("title":"#{I18n.t('views.rooms.new.activities_title', locale: lng)}"))
        expect(body).not_to match(/translation missing/i)
      end

      it "GET /rooms/:id/edit passes the localized location/image/activities titles" do
        get "/rooms/#{room.id}/edit"
        expect(response).to have_http_status(:ok)

        body = react_props_body
        expect(body).to include(%("title":"#{I18n.t('views.rooms.edit.location_title', locale: lng)}"))
        expect(body).to include(%("title":"#{I18n.t('views.rooms.edit.image_title', locale: lng)}"))
        expect(body).to include(%("title":"#{I18n.t('views.rooms.edit.activities_title', locale: lng)}"))
        expect(body).not_to match(/translation missing/i)
      end
    end
  end

  it "has genuinely distinct fr/en copy for the extracted props whose translation differs" do
    # image_title is deliberately identical in both locales ("Image" is spelled the same in
    # French and English), so it's excluded from this copy-paste-locale-bug check.
    %w[new.location_title new.activities_title edit.location_title edit.activities_title].each do |key|
      expect(I18n.t("views.rooms.#{key}", locale: "fr")).not_to eq(I18n.t("views.rooms.#{key}", locale: "en"))
    end
  end
end
