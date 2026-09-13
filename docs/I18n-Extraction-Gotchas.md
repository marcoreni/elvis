# i18n extraction gotchas

Reference notes for anyone doing further string-extraction work on this codebase. These are
conventions and traps discovered during the Phase 07 rollout — not open bugs, so they don't belong
in `docs/KnownIssues.md`. Keep this updated if a future extraction pass finds a new one; don't let
it grow into a changelog of what was already fixed.

## Load-bearing whitespace

A leading/trailing space in a translation value is sometimes concatenation glue or an intentional
gap next to inline HTML, not a typo. Don't let a normalize/trim pass strip it. Known cases:

- `planning:activityModal.createCoursesButton` / `createCourseButton` (trailing space before the
  next inline element), `activityModal.teacherChangeWarningLabel` (trailing space, `<b>` prefix).
- `common:messages.errIsInvalidId` (trailing space before a `<button>` rendered right after it).
- `activityApplications:summary.reasonForRefusal` / `summary.memberNumber` (leading/trailing space,
  concatenated with a value at the call site).
- `activityApplications:wizard.applicationSubtitle.{allActivities,oneActivity}` — leading-space-only
  fragments concatenated into `applicationSubtitle.full`; a trailing space would double the gap.

## Intentional HTML in translation values

`courses:lessonList.help.body`, `activityApplications:wizard.submit.applicationRegisteredHtml`,
`activityApplications:addPreApp.confirmHtml` contain literal `<br/>`/`<p>`/`<b>`/`<h5>` tags rendered
by sweetalert2 or `dangerouslySetInnerHTML` — the tags are intentional, not markup that leaked in.

## `<Trans>` and `transKeepBasicHtmlNodesFor`

react-i18next's default `transKeepBasicHtmlNodesFor` is `["br", "strong", "i", "p"]` — `em`/`a`/`u`
are **not** in it. For any other inline tag, use the indexed `<1>…</1>` form instead of writing the
tag name directly in the translation string. `parameters:editParameters.school.activitiesNotVatLabel`
is the existing example (`u` isn't keepable) — `<1>` must stay `<1>` in both locales.

## Plural keys need a non-plural fallback if `count` can be `undefined`

`t(key, { count: undefined })` renders the raw key string, not either plural form. Keys declared
`_one`/`_other` only will silently break if their `count` ever isn't a number.
`activityApplications:formulaActivitiesModal.{maxSelectable, selectToValidate, selectAmong}` are
`_one`/`_other`-only today; this only stays safe because `Formule#number_of_items` is always
present. Keep that attribute in any future serializer `as_json only:` list, or add a fallback key.

## Don't translate a value used in a `===` comparison

`activityApplications:summaryActivity.notSpecified` mirrors the raw French string a `===` check
elsewhere (`LevelCell`) compares against — it's correct to duplicate that raw string as a
translation value, but don't "clean up" the comparison literal itself to use the translated string.
Same rationale behind `planning/TimeIntervalHelpers.jsx`'s `levelDisplay()`: it returns the raw
French sentinels (`LEVEL_NOT_INDICATED`, `LEVEL_TO_SPECIFY`) for `===` call sites, while a separate
`levelDisplayLabel(value)` localizes only at render. Split any similar case into "compare" (use the
raw constant) vs. "display" (wrap in a localizing function) rather than translating the constant
itself.

## Singleton `i18n.t()` reads don't re-render on `languageChanged`

A helper like `const T = (k, o) => i18n.t(...)` (seen in StepZilla steps — `UserSearch.jsx`,
`WizardUserSelectMember.jsx`, `TimeIntervalPreferencesEditor.jsx`) re-reads the current language each
call but the *component* doesn't subscribe to `i18n`'s `languageChanged` event, so it won't re-render
on an in-page `i18n.changeLanguage()` — text goes stale until something else forces a re-render.
Currently harmless everywhere it appears because this app's locale switch
(`LocaleController#update`) does a full server-side reload, so no component lives across a language
change in practice. If that ever stops being true, either wrap the component in `withTranslation`/
`useTranslation` or explicitly subscribe to `languageChanged`.

The same "frozen at construct/mount time" shape shows up in several class components that build
`state` (react-table `columns`, tab names, day-name arrays passed to third-party widgets) once in
the constructor/`componentDidMount` using that render's `t` — see `docs/KnownIssues.md`'s
"translated UI frozen at construct time" entry for the current list of affected files.
