# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "`Activity#teacher` is N+1-prone independent
# of `.includes()`": the method used to call `teachers_activities.where(is_main: true)`, a plain
# AR query that bypassed any already-preloaded `teachers_activities` association and re-hit the
# DB every time regardless of upstream `.includes(:teachers_activities)`. It now filters the
# (possibly already-loaded) `teachers_activities` array in Ruby instead.
RSpec.describe Activity, type: :model do
  let(:main_teacher) do
    FactoryBot.create(
      :user, email: "activity-teacher-main@example.com", first_name: "Main", last_name: "Teacher", is_teacher: true
    )
  end
  let(:other_teacher) do
    FactoryBot.create(
      :user, email: "activity-teacher-other@example.com", first_name: "Other", last_name: "Teacher", is_teacher: true
    )
  end
  let(:activity_ref_kind) { FactoryBot.create(:activity_ref_kind, name: "Instrument") }
  let(:activity_ref) { FactoryBot.create(:activity_ref, activity_ref_kind: activity_ref_kind, label: "Piano") }
  let(:location) { Location.create!(label: "Site activity spec") }
  let(:room) { Room.create!(label: "Salle activity spec", location: location) }
  let(:time_interval) do
    TimeInterval.create!(start: 1.day.from_now.change(hour: 10), end: 1.day.from_now.change(hour: 11))
  end
  let!(:activity) do
    act = Activity.create!(
      time_interval: time_interval, activity_ref: activity_ref, room: room, location: location
    )
    TeachersActivity.create!(activity: act, teacher: other_teacher, is_main: false)
    TeachersActivity.create!(activity: act, teacher: main_teacher, is_main: true)
    act
  end

  describe "#teacher" do
    it "returns the teacher flagged is_main, ignoring other teachers_activities rows" do
      expect(activity.teacher).to eq(main_teacher)
    end

    it "returns nil when no teachers_activities row is flagged is_main" do
      Activity.find(activity.id).teachers_activities.update_all(is_main: false)

      expect(Activity.find(activity.id).teacher).to be_nil
    end

    it "reuses an already-preloaded teachers_activities association instead of re-querying it" do
      loaded = Activity.includes(:teachers_activities).find(activity.id)
      expect(loaded.association(:teachers_activities).loaded?).to eq(true)

      queries = []
      subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |*args|
        event = ActiveSupport::Notifications::Event.new(*args)
        queries << event.payload[:sql]
      end

      begin
        expect(loaded.teacher).to eq(main_teacher)
      ensure
        ActiveSupport::Notifications.unsubscribe(subscriber)
      end

      expect(queries.grep(/teachers_activities/i)).to be_empty
    end
  end
end
