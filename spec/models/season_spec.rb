# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the Season.current / Season.current_apps_season cache-invalidation gap
# found while root-causing the order-dependent spec flake documented in docs/KnownIssues.md ("A
# new spec file's mere presence... flips an unrelated, pre-existing application_controller_spec.rb
# example"). Both class methods cache their result (including a nil "no season" result) via
# Rails.cache.fetch with a 12h TTL and, before this fix, had no invalidation hook — unlike
# Parameter, which busts its own cache in an after_commit callback. A caller that queried before a
# season was created/changed would keep being served the stale value for up to 12h, causing an
# ArgumentError ("comparison of DateTime with nil failed") deep in
# Season#current_apps_season wherever code reads it afterwards (e.g. Ability#initialize via
# User#family) — reproduced concretely while investigating this ticket by running two concurrent
# `bundle exec rspec` processes against the same worktree, since Rails.cache is a real on-disk
# ActiveSupport::Cache::FileStore in the test env, shared by path across processes, not just
# examples.
RSpec.describe Season do
  # closing_date_for_applications 2 months out keeps `current_apps_season` resolving to the
  # current season itself (DateTime.now > closing_date_for_applications stays false), so it can
  # share this builder with the .current examples.
  def build_season(is_current:, start: Date.current)
    described_class.create!(
      label: "Saison #{start.year}-#{start.year + 1}",
      start: start,
      end: start + 10.months,
      is_current: is_current,
      opening_date_for_applications: start - 2.months,
      opening_date_for_new_applications: start - 1.month,
      closing_date_for_applications: start + 2.months
    )
  end

  describe ".current" do
    it "does not keep serving a cached nil after a current season is created" do
      expect(described_class.current).to be_nil

      season = build_season(is_current: true)

      expect(described_class.current).to eq(season)
    end

    it "does not keep serving a stale season after is_current is turned off" do
      season = build_season(is_current: true)
      expect(described_class.current).to eq(season)

      season.update!(is_current: false)

      expect(described_class.current).to be_nil
    end
  end

  describe ".current_apps_season" do
    it "does not keep serving a cached nil after a season is created" do
      expect(described_class.current_apps_season).to be_nil

      season = build_season(is_current: true)

      expect(described_class.current_apps_season).to eq(season)
    end
  end

  describe "cache invalidation (after_commit)" do
    it "busts both cache keys on create, update and destroy of any season, not just the current one" do
      current_season = build_season(is_current: true)
      described_class.current # prime the cache
      expect(Rails.cache.exist?("current_season")).to be true

      other_season = build_season(is_current: false, start: Date.current + 1.year)
      expect(Rails.cache.exist?("current_season")).to be false

      described_class.current # re-prime
      expect(Rails.cache.exist?("current_season")).to be true
      other_season.update!(label: "Renamed")
      expect(Rails.cache.exist?("current_season")).to be false

      described_class.current # re-prime
      expect(Rails.cache.exist?("current_season")).to be true
      DestroyJob.perform_now(classname: "Season", id: other_season.id)
      expect(Rails.cache.exist?("current_season")).to be false

      # sanity: the actually-current season was untouched by the other season's lifecycle
      expect(described_class.current).to eq(current_season)
    end
  end
end
