# Revue de PR #2 (feature/i18n-01-foundation-backend → develop) — constats en attente

Constats issus d'une revue de code approfondie de
[PR #2](https://github.com/marcoreni/elvis/pull/2), vérifiés manuellement (dont deux reproduits
directement en environnement réel). **Rien n'a encore été corrigé** — ce document sert de reprise
pour la prochaine session. Une fois un constat corrigé, le retirer de ce fichier (ou le cocher et
archiver le fichier une fois tout traité).

## Priorité haute — bugs confirmés

### 1. Passer en anglais fait planter le formatage de dates

**Fichiers concernés** : `app/models/season.rb:176,180`, `app/views/students/index.html.erb`,
`app/views/payments/bill.html.erb`, `app/views/devise/registrations/new.html.erb`, et tout autre
appel à `I18n.l`/`I18n.localize` avec un format custom (`:date_month_concise`, `:long_date`, etc.)

Cette PR vide `config/locales/en.yml` (juste un stub) et rend `:en` réellement sélectionnable pour
la première fois (sélecteur de langue + `Elvis::SUPPORTED_LOCALES` + `enforce_available_locales`
réactivé). Mais les clés de format personnalisées n'existent que dans `fr.yml`.

**Reproduit directement** :
```ruby
I18n.l(Time.now, format: :date_month_concise, locale: :en)
# => I18n::MissingTranslationData: Translation missing: en.time.formats.date_month_concise
```
`ApplicationController` ne rescue que `BaseRendererError`/`CanCan::AccessDenied` → 500 non catché
dès qu'un utilisateur en anglais visite une page utilisant un de ces formats.

**Piste de correction** : ajouter `time.formats.*`/`date.formats.*` (au moins
`date_month_concise`, `long_date`, `day`, `short_time`) dans `config/locales/en.yml`, ou wrapper
ces appels avec un `format:` qui a un fallback garanti dans toutes les langues supportées.

### 2. `require_logo` s'exécute avant `switch_locale`, contrairement à ce que dit le commentaire

`app/controllers/application_controller.rb:74-80` affirme que `switch_locale`
(`prepend_around_action`, déclaré ligne 4) "wraps every other before_action". Mais
`prepend_before_action :require_logo` est déclaré après (ligne 10), et chaque appel `prepend_*` de
Rails s'insère en tête de la chaîne partagée — donc le dernier `prepend` déclaré passe en premier.

**Vérifié directement** via `ApplicationController._process_action_callbacks` : l'ordre réel est
`before: require_logo` puis `around: switch_locale`.

Latent pour l'instant (`require_logo` ne touche pas à l'i18n), mais casse silencieusement la
garantie documentée. Tout futur `prepend_before_action`/`prepend_around_action` ajouté, ou tout
code ajouté à `require_logo` lui-même, s'exécutera hors de l'enveloppe de locale malgré le
commentaire.

**Piste de correction** : soit réordonner (déclarer `prepend_before_action :require_logo` avant
`prepend_around_action :switch_locale`), soit fusionner les deux en un seul `prepend_around_action`
qui appelle explicitement les deux dans l'ordre voulu, soit corriger le commentaire pour refléter
la réalité si l'ordre actuel est en fait acceptable.

## Priorité moyenne

### 3. `Parameter.get_value` tourne maintenant sans filet sur chaque requête

`app/controllers/application_controller.rb:92` — `Parameter.get_value` (lookup DB + `Rails.cache`,
sans rescue) est maintenant sur le chemin de **toutes** les requêtes via
`prepend_around_action :switch_locale`, pas seulement les endpoints liés à la locale. Un incident
Redis/cache, ou une ligne `Parameter` malformée (`value_type: "json"` avec un JSON invalide —
`Parameter#parse` ne rescue pas `JSON::ParserError`), ferait planter toute requête d'invité sans
cookie de langue. `HealthcheckController`/`PingController` héritent directement
d'`ActionController::Base` (contournent `switch_locale`), donc les health checks resteraient verts
pendant que le trafic réel plante.

### 4. `resolve_locale` ne retente pas les autres sources de la cascade

`app/controllers/application_controller.rb:96` — si la locale candidate échoue la validation
`Elvis::SUPPORTED_LOCALES`, le code saute direct à `I18n.default_locale` au lieu de retenter la
source suivante de la cascade (cookie, puis défaut d'installation). Si `Elvis::SUPPORTED_LOCALES`
est un jour restreint, un utilisateur dont `current_user.locale` contient une langue retirée serait
forcé en `:fr` même si son cookie ou le défaut d'installation contient une langue encore valide.

### 5. `redirect_back` peut faire atterrir un invité sur la page de connexion

`app/controllers/locale_controller.rb:12` — `root_path` a été vérifié : pour un invité, il pointe
directement vers `sessions#new` (pas de garde d'authentification qui rebondirait plus loin). Mais
un invité sans en-tête `Referer` (politique stricte du navigateur, ITP, requête non-navigationnelle)
perd quand même sa place : au lieu de rester sur la page publique où il a changé de langue (ex. le
formulaire de pré-inscription), il atterrit sur la page de connexion.

## Priorité basse — nettoyage

- **`app/controllers/application_controller.rb:84`** — le hash d'options de cookie
  (`{ value: ..., expires: 1.year, same_site: :lax }`) est dupliqué à l'identique dans
  `switch_locale` et `LocaleController#update` (`locale_controller.rb:8`). Extraire un helper/
  constante partagé.
- **`app/controllers/locale_controller.rb:7`** — la vérification "langue supportée" est dupliquée
  avec deux représentations différentes : chaînes dans `LocaleController`
  (`Elvis::SUPPORTED_LOCALES.include?(locale)`) vs symboles dans `resolve_locale`
  (`.map(&:to_sym).include?(locale)`). Risque de désynchronisation silencieuse.
- **`app/controllers/application_controller.rb:96`** — `Elvis::SUPPORTED_LOCALES.map(&:to_sym)`
  réalloue un tableau à chaque requête pour une valeur qui ne change jamais. Précalculer une
  constante gelée dans `lib/elvis/supported_locales.rb`.
- **Message de commit** — le commit principal de cette branche ("Add i18n backend foundation:
  locale resolution, switcher, tooling") ne suit pas Conventional Commits. La règle (voir
  `CLAUDE.md`) est devenue un ancêtre de cette branche après le rebase sur `develop` fusionnée ;
  à reformuler (ex. `feat(i18n): add backend locale resolution and switcher`) par cohérence.
