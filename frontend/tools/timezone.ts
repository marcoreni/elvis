// <html data-timezone="..."> is rendered server-side from Elvis::SchoolTimezone.iana_name (see
// config/application.rb's SCHOOL_TIMEZONE env var and lib/elvis/school_timezone.rb), the same
// boot-time-config-via-DOM-attribute pattern frontend/i18n/index.js uses for the locale. Read it
// directly instead of hardcoding a fallback, so the JS-side fallback can't diverge from the
// backend's actual configured zone.
export const SCHOOL_TIMEZONE: string =
    (typeof document !== "undefined" && document.documentElement.dataset.timezone) ||
    "Europe/Paris";

// Timestamps like begin_at/stopped_at are stored in the school's configured zone at local
// midnight. Formatting them without an explicit timeZone uses the *browser's* zone instead,
// which silently rolls the displayed date back a day for anyone west of that zone.
export const SCHOOL_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    timeZone: SCHOOL_TIMEZONE,
};
