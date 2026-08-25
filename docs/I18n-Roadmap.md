# Internationalisation (i18n) d'Elvis — feuille de route

Ce document est la source de vérité pour le chantier d'internationalisation d'Elvis. Il est
volontairement autonome (pas de dépendance à un fichier de plan externe) afin que n'importe quelle
session future — humaine ou agent — puisse reprendre le travail exactement là où il a été laissé.

## Contexte

Aujourd'hui, Elvis est ~100% en français codé en dur : environ 220 vues ERB et 317 composants
React contiennent du texte français directement inline, et il n'existe quasiment aucune
infrastructure i18n (`config/application.rb` verrouille même la locale à `:fr` via
`I18n.config.available_locales = :fr`). Elvis étant sur le point d'être forké, différentes
installations pourront vouloir des langues par défaut différentes (français, anglais, ...). Le
projet doit donc devenir réellement traduisible : langues pluggables, architecture de clés de
traduction, sélecteur de langue côté frontend avec persistance, documentation pour ajouter une
langue sans accompagnement, et une première traduction complète (français → anglais) prouvant que
tout le pipeline fonctionne de bout en bout.

C'est un chantier de plusieurs semaines, réparti sur de nombreux commits. Le travail est donc
découpé en branches **empilées** (chaque branche part de la précédente), afin que chaque revue
reste petite et que le travail soit reprenable à tout moment.

**Note sur le branching** : le dépôt n'a pas de branche `develop` — sa convention réelle (voir
`git log`) est des branches de fonctionnalité nommées par ticket, parties de `main`, fusionnées
via PR. Ce chantier suit cette convention réelle plutôt que d'inventer une branche `develop`.

## Décisions d'architecture

### Librairies

**Backend** — on garde `rails-i18n` (déjà présent, fournit les règles de pluriel CLDR). On ajoute :
- `devise-i18n` — traductions maintenues des chaînes Devise dans de nombreuses langues ; comble
  l'absence actuelle de `devise.fr.yml` (seul le `devise.en.yml` de base existe).
- `i18n-tasks` (dev/test uniquement) — `missing`/`unused`/`normalize`/`health` pour garder les
  clés cohérentes au fil du balayage du code.

**Frontend** — **i18next + react-i18next**, pas FormatJS/react-intl. Raisons décisives pour ce
code base précis :
- 118 des 317 composants sont des class components (91 seulement en function components ; les
  hooks n'apparaissent que dans 79 fichiers). Le HOC `withTranslation()` d'i18next est un pattern
  de première classe et maintenu ; l'équivalent FormatJS (`injectIntl`) est secondaire par rapport
  à son API hooks-first, ce qui ne convient pas à un code base à mi-chemin d'une migration hooks.
- Aucun outillage ICU MessageFormat n'existe dans le build actuel ; react-intl impose la syntaxe
  ICU. L'interpolation `{{var}}` et le pluriel `key_one`/`key_other` d'i18next sont plus proches
  de la convention Rails `%{var}`/`one`/`other` déjà connue côté backend.
- Le système de namespaces d'i18next se superpose directement à la structure de dossiers
  `frontend/components/<feature>/` existante (un namespace par dossier de fonctionnalité,
  chargeable à la demande), et `i18next-browser-languagedetector` / `i18next-parser` répondent
  directement aux besoins de détection et d'outillage d'extraction avec des outils matures.
- Le code-splitting par `import()` dynamique fonctionne déjà dans ce build (shakapacker + babel,
  pas de surcharge `splitChunks` custom), donc le JSON par langue/namespace peut être chargé à la
  demande.

### Stratégie de traduction

**Namespaces de clés** — reflètent la structure de dossiers existante :
- Backend YAML : `views.<controller>.<action>.<key>`, `activerecord.models/attributes.*` (repris
  automatiquement par les helpers de formulaire Rails), `common.actions.*`/`common.confirm.*`
  pour les chaînes aujourd'hui dupliquées brutes dans les vues ("Enregistrer", "Annuler", dialogues
  de confirmation de suppression). `translate_enum` (`app/models/activity_ref.rb:123`) garde sa
  convention existante.
- Frontend JSON : `frontend/locales/<locale>/<namespace>.json`, un namespace par dossier
  `frontend/components/<feature>/`, plus un namespace `common` pour le chrome partagé (boutons
  SweetAlert2, en-têtes de tableau).

**Pluriel** — natif aux deux stacks, sans plugin supplémentaire : `I18n.t(key, count: n)` côté
Rails avec des clés YAML `one`/`other` (règles CLDR via `rails-i18n`) ; suffixes `_one`/`_other`
natifs d'i18next côté frontend.

**Interpolation** — volontairement non unifiée entre les deux stacks : `%{name}` côté Rails,
`{{name}}` côté i18next. Un composant React doit toujours recevoir une chaîne déjà interpolée en
prop, jamais une clé brute + placeholders à ré-interpoler côté client.

**Texte riche / XSS** — backend : convention Rails des clés suffixées `_html` (auto `html_safe`,
markup rédigé uniquement par les traducteurs). Frontend : `<Trans i18nKey="...">` de
react-i18next plutôt que `dangerouslySetInnerHTML` ; si du HTML brut est vraiment nécessaire,
passer par `isomorphic-dompurify` (déjà une dépendance).

**Explicitement hors périmètre** : les emails `NotificationTemplate` (Liquid + WYSIWYG, stockés en
base, rédigés par l'admin de chaque instance) et les autres textes pilotés par `Parameter`. C'est
de la rédaction de contenu par instance, différent de la traduction de l'interface.

**Exception connue à préserver, pas à "corriger"** : `app/views/payments/bill.html.erb:68` fige
`I18n.with_locale("fr")` — quasi certainement intentionnel (un document fiscal/légal français doit
rester en français quelle que soit la langue de l'interface). À documenter comme exception
délibérée, pas comme bug.

### Résolution de la locale & sélection de langue frontend

**Cascade de priorité**, résolue une fois par requête :
1. Utilisateur connecté : `current_user.locale` (nouvelle colonne nullable ; `nil` = utiliser la
   valeur par défaut de l'installation)
2. Invité : cookie `locale` (posé par le sélecteur de langue, expiration 1 an)
3. `Parameter.get_value("localization.default_language")` — la langue par défaut de l'installation
4. `I18n.default_locale` (`:fr`) — filet de sécurité final, ne jamais le retirer

**Nouvelles pièces à construire :**
- Migration : `add_column :users, :locale, :string, limit: 10`.
- Un unique `around_action` dans `ApplicationController` implémentant la cascade ci-dessus,
  qui pose/rafraîchit le cookie `locale`. **Confirmé que cela couvre aussi les pages Devise** —
  bien que `SessionsController < Devise::SessionsController`, le `DeviseController` de Devise
  hérite par défaut d'`ApplicationController` (vérifié : le before_action `require_logo` de
  `ApplicationController` alimente déjà `@school_informations`, que
  `app/views/devise/sessions/new.html.erb` lit déjà — donc les hooks d'`ApplicationController`
  s'exécutent déjà sur la page de connexion Devise). Pas besoin de câblage spécifique par
  contrôleur.
- `config/application.rb` : remplacer le verrou actuel — `config.i18n.available_locales =
  Elvis::SUPPORTED_LOCALES` (nouvelle constante, ex. `config/initializers/i18n.rb` définissant
  `%w[fr en].freeze`), garder `default_locale = :fr`, et réellement activer
  `enforce_available_locales` (actuellement désactivé de force).
- **Synchronisation du premier rendu, sans nouvel objet bootstrap** : ajouter
  `<html lang="<%= I18n.locale %>">` aux trois layouts (`application.html.erb`, `devise.html.erb`,
  `simple.html.erb`). Configurer l'init i18next de `frontend/i18n/index.js` pour lire la langue
  initiale depuis `document.documentElement.lang` (détecteur `htmlTag` de
  `i18next-browser-languagedetector`). Cela évite d'inventer un objet bootstrap global façon `gon`
  et évite de toucher chaque appel `react_component(...)` existant.
- **Sélecteur de langue : ERB simple, pas React.** Les layouts nus (`devise.html.erb`,
  `simple.html.erb`) ne montent aucun React aujourd'hui. Ajouter
  `app/views/partials/_language_switcher.html.erb` (un petit dropdown) postant vers une nouvelle
  route `PATCH /locale` → `LocaleController#update`, qui pose le cookie (et
  `current_user.locale` si connecté) et redirige. Inclure ce seul partial dans les trois layouts —
  fonctionne identiquement pour les invités et les utilisateurs connectés, pas besoin d'un widget
  React dédié.
- **Écran de réglages global de l'installation** : ajouter
  `Parameters::LocalizationParametersController` sous le bloc `namespace :parameters do end`
  existant (`config/routes.rb`), en clonant exactement le pattern GET/POST-JSON de
  `app/controllers/parameters/planning_parameters_controller.rb` (`Parameter.get_value` /
  `find_or_create_by`). Stocker `localization.default_language` (`value_type: "string"`) et
  `localization.available_languages` (`value_type: "json"`, un tableau — restreint au
  sous-ensemble de `Elvis::SUPPORTED_LOCALES` qui a réellement des fichiers de traduction, pour
  qu'un admin ne puisse pas activer une langue sans traductions). Nouvel écran React sous
  `frontend/components/parameters/`, plus une nouvelle entrée `Elvis::MenuManager`
  (`lib/elvis/menu_manager.rb`) à côté des liens `school_parameters`/`community_parameters`
  existants. (Pas `CommunityParametersController` — déjà réaffecté à un outil de fusion
  d'utilisateurs malgré son nom — ni `parameters_controller.rb`'s `school_parameters`, qui
  concerne l'identité légale/contact de l'école, un sujet différent.)
- `config/settings.yml` est confirmé mort, résidu Redmine inutilisé — **ne pas s'en servir** ; la
  vraie convention de réglages est les lignes `Parameter` en base comme ci-dessus.

### Documentation (`docs/I18n.md`, à créer en branche 01)

Devra couvrir : vue d'ensemble de l'architecture des deux stacks ; tableau de correspondance
namespace de clé ↔ dossier ; la cascade de résolution de locale et où changer la langue par défaut
de l'installation ; aide-mémoire pluriel/interpolation ; règles texte riche/XSS ; l'exception
`bill.html.erb` ; un exemple `withTranslation` pour un class component ; et une checklist
**"ajouter une nouvelle langue"** pas à pas (ajouter le code à `Elvis::SUPPORTED_LOCALES`, créer
`config/locales/<code>.yml` + `frontend/locales/<code>/*.json`, ajouter/vérifier une locale
`devise-i18n`, l'activer dans le nouvel écran d'admin, lancer `bundle exec i18n-tasks health` + le
script d'extraction JS, traduire les manques rapportés).

## Découpage en branches empilées

Branches `feature/i18n-0N-*` empilées à partir de `main`, chacune partant de la précédente au fur
et à mesure de son intégration :

- [x] **`feature/i18n-00-plan`** *(cette session)* — ce document. Aucun changement de code
      applicatif.
- [ ] **`feature/i18n-01-foundation-backend`** *(indépendante, fusionnable en premier, inerte)*
  - [ ] Gemfile : `devise-i18n`, `i18n-tasks` (groupe dev/test)
  - [ ] `config/initializers/i18n.rb` : constante `Elvis::SUPPORTED_LOCALES = %w[fr en].freeze`
  - [ ] `config/application.rb` : lever le verrou de langue, activer `enforce_available_locales`
  - [ ] Migration `add_column :users, :locale, :string, limit: 10`
  - [ ] `ApplicationController` : `around_action` de résolution de locale (cascade cookie → user →
        Parameter → défaut)
  - [ ] `LocaleController` + route `PATCH /locale` + `app/views/partials/_language_switcher.html.erb`
  - [ ] `<html lang="...">` dans les 3 layouts (`application.html.erb`, `devise.html.erb`,
        `simple.html.erb`)
  - [ ] Config `i18n-tasks` (`.i18n-tasks.yml`)
  - [ ] Nettoyage du contenu `en.yml` (résidu de scaffold Rails, jamais utilisé)
  - [ ] `docs/I18n.md` (première version, backend uniquement)
- [ ] **`feature/i18n-02-foundation-frontend`** *(indépendante, fusionnable tôt, inerte)*
  - [ ] `yarn add i18next react-i18next i18next-browser-languagedetector`
  - [ ] `yarn add -D i18next-parser`
  - [ ] `frontend/i18n/index.js` (init i18next, détection via `document.documentElement.lang`,
        namespaces, lazy loading) câblé dans `frontend/packs/app.js` avant
        `ReactRailsUJS.useContext`
  - [ ] Config extraction (`.i18next-parser.config.js`)
  - [ ] `frontend/locales/{fr,en}/common.json` (stub)
  - [ ] Centraliser le changement de locale `moment` (actuellement `require("moment/locale/fr")`
        dispersé dans ~10+ fichiers) sur l'événement `languageChanged` d'i18next
  - [ ] Compléter `docs/I18n.md` avec la partie frontend
- [ ] **`feature/i18n-03-localization-settings`** *(dépend de 01+02)*
  - [ ] `Parameters::LocalizationParametersController` (clone de `PlanningParametersController`)
  - [ ] Route sous `namespace :parameters`
  - [ ] Écran React `LocalizationParameters` (choix langue par défaut + langues disponibles)
  - [ ] Entrée de menu `Elvis::MenuManager`
- [ ] **`feature/i18n-04-devise-and-public-pages`** *(dépend de 01)*
  - [ ] `app/views/devise/**` (connexion, inscription, mot de passe, confirmation...)
  - [ ] `app/views/users/new_application.html.erb` (pré-inscription publique)
  - [ ] `app/views/sessions/pick_user.html.erb`
  - [ ] Vérifier/compléter les clés `devise-i18n` manquantes pour les vues custom
- [ ] **`feature/i18n-05-extract-users`** *(dépend de 01+02, indépendante de 04)* — vague de preuve
      de bout en bout
  - [ ] `frontend/components/UserList.jsx` (class component → `withTranslation`)
  - [ ] `frontend/components/UserEdit.jsx`
  - [ ] `app/views/users/**`
  - [ ] Traduction anglaise complète de ce périmètre (première langue seconde prouvée de bout en
        bout)
- [ ] **`feature/i18n-06-extract-<domaine>`** *(répétable, mutuellement indépendantes, ~15-30
      fichiers chacune)* — une branche par domaine, dans n'importe quel ordre :
  - [ ] `planning`
  - [ ] `activities`
  - [ ] `evaluation`
  - [ ] `courses` / `formules`
  - [ ] `parameters` / `editParameters` restants
  - [ ] `payments` (en excluant l'exception volontaire `bill.html.erb`)
  - [ ] (compléter cette liste au fur et à mesure que d'autres domaines sont identifiés)

Seules 01 et 02 bloquent les branches d'extraction ; à partir de 03 tout est mutuellement
indépendant et peut être réordonné ou repris lors d'une session future.

## Vérification

- Après 01 : l'app démarre, `/u/sign_in` s'affiche toujours (les contrôleurs Devise héritent du
  nouveau hook via `ApplicationController`), changer le cookie `locale` change bien `I18n.locale`
  à la requête suivante, une locale invalide lève désormais une erreur au lieu d'échouer
  silencieusement (`enforce_available_locales` réactivé).
- Après 02 : `frontend/packs/app.js` démarre sans erreur console, `i18next` est accessible dans un
  composant via `useTranslation`/`withTranslation`.
- Après 05 : changer la langue via le nouveau sélecteur, vérifier que la liste et la fiche
  utilisateur s'affichent entièrement en anglais sans clé de traduction brute visible, vérifier que
  le français fonctionne toujours après retour en arrière.
- En continu : `bundle exec i18n-tasks health` et le script d'extraction JS ne doivent rapporter
  aucune clé manquante pour les périmètres déjà balayés.
