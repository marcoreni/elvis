require "i18n/backend/fallbacks"

I18n::Backend::Simple.include(I18n::Backend::Fallbacks)

# Safety net for translation keys (in particular custom I18n.l formats) that exist in fr.yml
# but haven't been added to en.yml yet — see docs/I18n-PR2-Review-Findings.md finding #1.
I18n.fallbacks[:en] = [:en, :fr]
