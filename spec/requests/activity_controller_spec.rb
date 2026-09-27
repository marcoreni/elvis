# frozen_string_literal: true

require "rails_helper"

# Regression coverage for ActivityController#list (POST /activities.json): a rubocop
# safe-autocorrect commit (4709712c) collapsed the original
# `if admin / elsif allowed-teacher / else redirect` branching into a single `if admin` block
# that unconditionally redirected every admin to root instead of rendering JSON -- the empty
# `elsif` body (a deliberate "explicitly allowed, nothing extra to do" branch) confused the
# autocorrecter. Exercises all three branches directly against the real controller action rather
# than just asserting the redirect is gone.
RSpec.describe "POST /activities.json", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) { FactoryBot.create(:user, email: "activity-spec-admin@example.com", is_admin: true) }
  let(:allowed_teacher) { FactoryBot.create(:user, email: "activity-spec-teacher-ok@example.com", is_teacher: true) }
  let(:disallowed_teacher) do
    FactoryBot.create(:user, email: "activity-spec-teacher-no@example.com", is_teacher: true)
  end
  let(:regular_user) { FactoryBot.create(:user, email: "activity-spec-user@example.com") }

  around do |example|
    Rails.cache.delete("parameter_teachers.teacher_can_manage_courses")
    example.run
    Rails.cache.delete("parameter_teachers.teacher_can_manage_courses")
  end

  def post_activities_list
    post "/activities.json", params: { filtered: [], page: 0, page_size: 20 }, as: :json
  end

  context "as an admin" do
    before { sign_in admin }

    it "renders JSON instead of redirecting" do
      post_activities_list

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("application/json")
    end
  end

  context "as a teacher allowed to manage courses" do
    before do
      Parameter.create!(label: "teachers.teacher_can_manage_courses", value_type: "boolean", value: "true")
      sign_in allowed_teacher
    end

    it "renders JSON instead of redirecting" do
      post_activities_list

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("application/json")
    end
  end

  context "as a teacher without the manage-courses permission" do
    before do
      Parameter.create!(label: "teachers.teacher_can_manage_courses", value_type: "boolean", value: "false")
      sign_in disallowed_teacher
    end

    it "redirects to root instead of rendering JSON" do
      post_activities_list

      expect(response).to redirect_to(root_path)
    end
  end

  context "as a non-admin, non-teacher user" do
    before { sign_in regular_user }

    it "redirects to root instead of rendering JSON" do
      post_activities_list

      expect(response).to redirect_to(root_path)
    end
  end
end

# Regression coverage for ActivityController#create (POST /activity): `authorize!` referenced
# `interval`/`activity_ref`/`room`/`location` before they were assigned (those locals were only
# defined later, inside the transaction), so every submission raised a NameError before ever
# reaching the transaction. Exercises the real create flow end-to-end, and confirms the
# (relocated) authorization check still actually denies a non-admin.
RSpec.describe "POST /activity (ActivityController#create)", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) do
    FactoryBot.create(:user, email: "activity-create-admin@example.com", first_name: "Admin", last_name: "Create",
                             is_admin: true)
  end
  let(:regular_user) do
    FactoryBot.create(:user, email: "activity-create-user@example.com", first_name: "Regular", last_name: "Create")
  end
  let(:teacher) do
    FactoryBot.create(:user, email: "activity-create-teacher@example.com", first_name: "Teacher", last_name: "Create",
                             is_teacher: true)
  end

  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind) }
  # 2 instruments so the create action's `instruments: activity_ref.instruments` assignment is
  # exercised too (it creates ActivitiesInstrument join rows as a side effect of Activity.create!).
  let(:instruments) do
    [Instrument.create!(label: "Piano create spec"), Instrument.create!(label: "Violon create spec")]
  end
  let(:activity_ref) do
    FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano").tap do |ref|
      ref.instruments = instruments
    end
  end
  let(:location) { Location.create!(label: "Batiment create spec") }
  let(:room) { Room.create!(label: "Salle create spec", location: location) }
  let!(:season) do
    Season.create!(
      label: "Saison create spec",
      start: 3.days.from_now.beginning_of_day,
      end: 10.days.from_now.end_of_day,
      opening_date_for_applications: 30.days.ago,
      opening_date_for_new_applications: 25.days.ago,
      closing_date_for_applications: 5.days.from_now,
      is_current: true
    )
  end

  def activity_params
    start_time = (season.start + 1.day).change(hour: 10, min: 0)
    end_time = start_time + 1.hour

    {
      activity: {
        startTime: start_time.iso8601,
        endTime: end_time.iso8601,
        teacherId: teacher.id,
        activityRefId: activity_ref.id,
        roomId: room.id
      }
    }
  end

  def post_create_activity
    post "/activity", params: activity_params, as: :json
  end

  around do |example|
    Rails.cache.delete("parameter_teachers.teacher_can_manage_courses")
    example.run
    Rails.cache.delete("parameter_teachers.teacher_can_manage_courses")
  end

  context "as an admin" do
    before { sign_in admin }

    it "creates the activity instead of raising a NameError" do
      expect { post_create_activity }.to change(Activity, :count).by(1)
                                                                 .and(change(ActivitiesInstrument, :count).by(2))

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("application/json")

      created = Activity.last
      expect(created.activity_ref).to eq(activity_ref)
      expect(created.room).to eq(room)
      expect(created.teacher).to eq(teacher)
      expect(created.instruments).to match_array(instruments)
    end
  end

  context "as a non-admin, non-teacher user" do
    before { sign_in regular_user }

    it "is denied and creates nothing (the relocated authorize! still gates creation)" do
      # `change(...).by(0)`, not RSpec's `not_change` -- this RSpec version (3.13) doesn't ship
      # that matcher (its own docs cite `not_change` only as an example name to avoid when
      # defining a *custom* negated matcher, e.g. via `define_negated_matcher`).
      expect { post_create_activity }.to change(Activity, :count).by(0)
                                                                 .and(change(TimeInterval, :count).by(0))
                                                                 .and(change(ActivitiesInstrument, :count).by(0))

      expect(response).to have_http_status(:forbidden)
    end
  end

  context "as a teacher without the manage-courses permission" do
    before do
      Parameter.create!(label: "teachers.teacher_can_manage_courses", value_type: "boolean", value: "false")
      sign_in teacher
    end

    it "is denied and creates nothing" do
      expect { post_create_activity }.to change(Activity, :count).by(0)
                                                                 .and(change(TimeInterval, :count).by(0))
                                                                 .and(change(ActivitiesInstrument, :count).by(0))

      expect(response).to have_http_status(:forbidden)
    end
  end

  context "as a teacher allowed to manage courses" do
    before do
      Parameter.create!(label: "teachers.teacher_can_manage_courses", value_type: "boolean", value: "true")
      sign_in teacher
    end

    it "creates the activity" do
      expect { post_create_activity }.to change(Activity, :count).by(1)

      expect(response).to have_http_status(:ok)

      created = Activity.last
      expect(created.activity_ref).to eq(activity_ref)
      expect(created.room).to eq(room)
      expect(created.teacher).to eq(teacher)
    end
  end
end
