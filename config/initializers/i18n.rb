# frozen_string_literal: true

require "i18n/backend/fallbacks"

I18n::Backend::Simple.include(I18n::Backend::Fallbacks)

# Safety net for translation keys (in particular custom I18n.l formats) that exist in fr.yml
# but haven't been added to en.yml yet.
I18n.fallbacks[:en] = %i[en fr]
