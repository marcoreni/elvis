# frozen_string_literal: true

require "rails_helper"

RSpec.describe TimeInterval, type: :model do
  describe ".with_teacher" do
    let(:teacher) { FactoryBot.create(:user, email: "time-interval-with-teacher@example.com", is_teacher: true) }
    let(:planning) { Planning.create!(user: teacher) }
    let!(:time_interval) do
      TimeInterval.create!(start: 1.day.from_now.change(hour: 9), end: 1.day.from_now.change(hour: 10)).tap do |ti|
        planning.time_intervals << ti
      end
    end

    it "returns the intervals linked to the teacher's plannings" do
      expect(TimeInterval.with_teacher(teacher.id)).to include(time_interval)
    end

    # Regression for the KnownIssues.md entry: `0` is the real fallback `teacher_id` sent by
    # ActivityDetailsModal.jsx's constructor when no teacher is assigned. The scope used to call
    # `User.find(teacher_id)`, raising `ActiveRecord::RecordNotFound` instead of matching nothing.
    it "returns an empty relation for a teacher_id of 0 instead of raising" do
      expect { TimeInterval.with_teacher(0) }.not_to raise_error
      expect(TimeInterval.with_teacher(0)).to be_empty
    end

    it "returns an empty relation for any teacher_id with no matching planning" do
      expect(TimeInterval.with_teacher(teacher.id + 1)).to be_empty
    end
  end

  context "when the season begins on Monday and the time interval is the first day of the season" do
    describe "#convert_to_first_week_of_season" do
      let(:season) do
        Season.new(
          start: "2023-09-04".to_datetime.in_time_zone,
          end: "2024-06-30".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-09-04T09:00:00".to_datetime.in_time_zone,
          end: "2023-09-04T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-04T09:00:00".to_datetime.in_time_zone)
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-04T10:00:00".to_datetime.in_time_zone)
      end
    end
  end

  context "when the season begins on Monday and when the time interval is in the middle of the season" do
    describe "#convert_to_first_week_of_season" do
      let(:season) do
        Season.new(
          start: "2023-09-04".to_datetime.in_time_zone,
          end: "2024-06-30".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-09-12T09:00:00".to_datetime.in_time_zone,
          end: "2023-09-12T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-05T09:00:00".to_datetime.in_time_zone)
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-05T10:00:00".to_datetime.in_time_zone)
      end
    end
  end

  context "when the season begins on Monday and when the time interval is past the end of season" do
    describe "#convert_to_first_week_of_season" do
      let(:season) do
        Season.new(
          start: "2023-09-04".to_datetime.in_time_zone,
          end: "2024-06-30".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2024-09-12T09:00:00".to_datetime.in_time_zone, # thursday
          end: "2024-09-12T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-07T09:00:00".to_datetime.in_time_zone) # first thursday of the season
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-07T10:00:00".to_datetime.in_time_zone)
      end
    end
  end

  context "when the season begins on Monday and when the time interval is before the start of season" do
    describe "#convert_to_first_week_of_season" do
      let(:season) do
        Season.new(
          start: "2023-09-04".to_datetime.in_time_zone,
          end: "2024-06-30".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-08-31T09:00:00".to_datetime.in_time_zone, # thursday
          end: "2023-08-31T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-07T09:00:00".to_datetime.in_time_zone) # first thursday of the season
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-07T10:00:00".to_datetime.in_time_zone)
      end
    end
  end

  context "when the season begins on Tuesday and the time interval is the first day of the season" do
    describe "#convert_to_first_week_of_season" do
      let(:season) do
        Season.new(
          start: "2023-09-05".to_datetime.in_time_zone,
          end: "2024-06-30".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-09-05T09:00:00".to_datetime.in_time_zone,
          end: "2023-09-05T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-05T09:00:00".to_datetime.in_time_zone)
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-05T10:00:00".to_datetime.in_time_zone)
      end
    end
  end

  context "when the season begins on Tuesday and when the time interval is on Tuesday in the middle of the season" do
    describe "#convert_to_first_week_of_season" do
      let(:season) do
        Season.new(
          start: "2023-09-05".to_datetime.in_time_zone,
          end: "2024-06-30".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-09-12T09:00:00".to_datetime.in_time_zone,
          end: "2023-09-12T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-05T09:00:00".to_datetime.in_time_zone)
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-05T10:00:00".to_datetime.in_time_zone)
      end
    end
  end

  context "when the season begins on Tuesday and when the time interval is on Monday in the middle of the season" do
    describe "#convert_to_first_week_of_season" do
      let(:season) do
        Season.new(
          start: "2023-09-05".to_datetime.in_time_zone,
          end: "2024-06-30".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-09-18T09:00:00".to_datetime.in_time_zone,
          end: "2023-09-18T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-11T09:00:00".to_datetime.in_time_zone)
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-11T10:00:00".to_datetime.in_time_zone)
      end
    end
  end

  context "when the season begins on Monday and when the time interval is past the end of season" do
    describe "#convert_to_first_week_of_season" do
      let(:season) do
        Season.new(
          start: "2023-08-31".to_datetime.in_time_zone,
          end: "2024-05-31".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-08-28T09:00:00".to_datetime.in_time_zone, # thursday
          end: "2023-08-28T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-04T09:00:00".to_datetime.in_time_zone) # first thursday of the season
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-04T10:00:00".to_datetime.in_time_zone)
      end
    end
  end

  context "when the season begins on Monday and when the time interval is before the start of season" do
    describe "#convert_to_first_week_of_season without ensure_day_in_season" do
      let(:season) do
        Season.new(
          start: "2023-08-31".to_datetime.in_time_zone,
          end: "2024-05-31".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-08-28T09:00:00".to_datetime.in_time_zone, # thursday
          end: "2023-08-28T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season, false)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-08-28T09:00:00".to_datetime.in_time_zone) # first thursday of the season
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-08-28T10:00:00".to_datetime.in_time_zone)
      end
    end

    describe "#convert_to_first_week_of_season with ensure_day_in_season" do
      let(:season) do
        Season.new(
          start: "2023-08-31".to_datetime.in_time_zone,
          end: "2024-05-31".to_datetime.in_time_zone
        )
      end
      let(:time_interval) do
        TimeInterval.new(
          start: "2023-08-28T09:00:00".to_datetime.in_time_zone, # thursday
          end: "2023-08-28T10:00:00".to_datetime.in_time_zone
        )
      end

      before do
        time_interval.convert_to_first_week_of_season(season, true)
      end

      it "modifies the start date correctly" do
        expect(time_interval.start).to eq("2023-09-04T09:00:00".to_datetime.in_time_zone) # first thursday of the season
      end

      it "modifies the end date correctly" do
        expect(time_interval.end).to eq("2023-09-04T10:00:00".to_datetime.in_time_zone)
      end
    end
  end
end
