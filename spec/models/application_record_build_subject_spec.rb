# frozen_string_literal: true

require "rails_helper"

# Regression coverage for the KnownIssues.md entry "ApplicationRecord#build_subject's
# vowel-detection misses accented vowels": `build_subject` used to pick French grammar via a plain
# ASCII vowel regex (`/^[aeiouyAEIOUY]/`), which missed an accented first letter. Several models'
# `display_class_name` (delegating to `activerecord.models.<key>` in config/locales/fr.yml) starts
# with an accented vowel -- e.g. Student ("élève") and School ("école") -- so `build_subject` used
# to render the ungrammatical "le élève"/"la école" instead of the correctly elided "l'élève"/
# "l'école". The regex now also matches the common accented French vowels.
RSpec.describe ApplicationRecord, ".build_subject" do
  around do |example|
    I18n.with_locale(:fr) { example.run }
  end

  it "elides to l'... for a model whose French name starts with an accented vowel (Student -> élève)" do
    expect(Student.build_subject).to eq("l'élève")
  end

  it "elides to l'... for a model whose French name starts with an accented vowel (School -> école)" do
    expect(School.build_subject).to eq("l'école")
  end

  it "still applies masculine 'le' unchanged for a consonant-starting, non-accented name (Band -> groupe de musique)" do
    expect(Band.build_subject).to eq("le groupe de musique")
  end
end
