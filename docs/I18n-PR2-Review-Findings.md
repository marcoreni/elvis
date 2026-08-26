# Revue de PR #2 (feature/i18n-01-foundation-backend → develop) — constats

Constats issus d'une revue de code approfondie de
[PR #2](https://github.com/marcoreni/elvis/pull/2), vérifiés manuellement (dont deux reproduits
directement en environnement réel). **Les 9 constats ont été corrigés** (session du 2026-08-26,
commit `feat(i18n): add backend locale resolution and switcher` amendé + fixes non commités sur
`feature/i18n-01-foundation-backend`) — voir le détail de chaque correction ci-dessous.

## Priorité haute — bugs confirmés

### 1. Passer en anglais fait planter le formatage de dates — ✅ corrigé

**Correction appliquée** : ajout des clés `time.formats.{date_month_concise,long_date,day,
short_time}` et `date.formats.date_month_concise` dans `config/locales/en.yml`, plus
`config/initializers/i18n.rb` qui active `I18n::Backend::Fallbacks` (`en` retombe sur `fr`) comme
filet de sécurité pour toute clé de format ajoutée à l'avenir sans traduction anglaise. Vérifié par
reproduction directe (`I18n.l(Time.now, format: :date_month_concise, locale: :en)` retourne
maintenant une date formatée au lieu de lever `MissingTranslationData`).

### 2. `require_logo` s'exécute avant `switch_locale` — ✅ corrigé

**Correction appliquée** : `app/controllers/application_controller.rb` — inversion de l'ordre de
déclaration (`prepend_before_action :require_logo` avant `prepend_around_action :switch_locale`)
pour que `switch_locale`, déclaré en dernier, soit effectivement le plus englobant. Vérifié via
`ApplicationController._process_action_callbacks` : l'ordre réel est maintenant
`around: switch_locale` puis `before: require_logo`, conforme au commentaire.

## Priorité moyenne — corrigé

### 3. `Parameter.get_value` tourne sans filet sur chaque requête — ✅ corrigé

**Correction appliquée** : l'appel à `Parameter.get_value` dans `resolve_locale` est maintenant
entouré d'un `rescue StandardError` qui logue l'erreur et traite la source comme absente (passage à
la source suivante de la cascade / à `I18n.default_locale`), au lieu de laisser planter la requête.

### 4. `resolve_locale` ne retentait pas les autres sources de la cascade — ✅ corrigé

**Correction appliquée** : `resolve_locale` valide maintenant chaque source de la cascade
(utilisateur, cookie, défaut d'installation) dans l'ordre contre
`Elvis::SUPPORTED_LOCALES_SYMBOLS`, et passe à la source suivante si une valeur est absente ou
invalide, au lieu de sauter directement à `I18n.default_locale` dès le premier échec.

### 5. `redirect_back` pouvait faire atterrir un invité sur la page de connexion — ✅ corrigé

**Correction appliquée** : `LocaleController#update` accepte maintenant un paramètre `return_to`
(chemin relatif validé, pas de `//` pour éviter une redirection open-redirect) envoyé explicitement
par `_language_switcher.html.erb` (`request.fullpath`), et redirige vers ce chemin en priorité —
`root_path` n'est plus utilisé qu'en tout dernier recours si `return_to` est absent. `redirect_back`
a été abandonné car son fallback interne se confond avec le `Referer`, qui est justement la source
non fiable à l'origine du bug.

## Priorité basse — nettoyage — ✅ corrigé

- **Cookie de locale dupliqué** : extrait dans `ApplicationController#locale_cookie`, réutilisé par
  `switch_locale` et `LocaleController#update`.
- **Validation de langue supportée dupliquée avec deux représentations** : unifiée sur des symboles
  via la nouvelle constante `Elvis::SUPPORTED_LOCALES_SYMBOLS`, utilisée à la fois par
  `resolve_locale` et `LocaleController#update`.
- **Réallocation de `SUPPORTED_LOCALES.map(&:to_sym)` à chaque requête** : précalculée une fois dans
  `Elvis::SUPPORTED_LOCALES_SYMBOLS` (`lib/elvis/supported_locales.rb`).
- **Message de commit non conforme** : le commit `Add i18n backend foundation: locale resolution,
  switcher, tooling` a été réécrit (`git commit --amend`, tip de branche) en
  `feat(i18n): add backend locale resolution and switcher`.
