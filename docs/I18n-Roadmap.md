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

**Note sur le branching** : ce chantier a démarré avant l'introduction d'une branche `develop` —
sa convention historique (voir `git log`) était des branches de fonctionnalité nommées par ticket,
parties de `main`, fusionnées via PR. Une branche `develop` a depuis été créée pour servir de
branche d'intégration (voir `CLAUDE.md`) ; cette PR cible désormais `develop`, et les branches de
ce chantier restent empilées les unes sur les autres comme prévu.

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
3. `Parameter.get_value("app.localization.default_language")` — la langue par défaut de l'installation
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
  Elvis::SUPPORTED_LOCALES` (nouvelle constante `%w[fr en].freeze`, posée dans
  `lib/elvis/supported_locales.rb` et pas dans un initializer : elle doit être chargée avant le
  corps de classe de `config/application.rb`, qui s'exécute avant que les initializers ne tournent
  — même pattern d'`require_relative` explicite que `lib/elvis/version.rb`), garder
  `default_locale = :fr`, et réellement activer `enforce_available_locales` (actuellement
  désactivé de force).
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
  `find_or_create_by`). Stocker `app.localization.default_language` (`value_type: "string"`) et
  `app.localization.available_languages` (`value_type: "json"`, un tableau — restreint au
  sous-ensemble de `Elvis::SUPPORTED_LOCALES` qui a réellement des fichiers de traduction, pour
  qu'un admin ne puisse pas activer une langue sans traductions). Nouvel écran React sous
  `frontend/components/parameters/`. Pas de nouvelle entrée `Elvis::MenuManager`
  (`lib/elvis/menu_manager.rb`) : ce mécanisme sert la navigation globale de l'app, pas la page
  `/parameters` — les écrans de réglages individuels (École, Emails, Formules...) sont en réalité
  de simples cartes ajoutées dans `ParametersController#set_base_parameters`, qui alimentent la
  page `/parameters` déjà existante ; c'est ce mécanisme qu'il faut utiliser ici (nouvelle carte
  "Langues" sous `@parameters[:général]`). (Pas non plus `CommunityParametersController` — déjà
  réaffecté à un outil de fusion d'utilisateurs malgré son nom — ni `parameters_controller.rb`'s
  `school_parameters`, qui concerne l'identité légale/contact de l'école, un sujet différent.)
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
- [x] **`feature/i18n-01-foundation-backend`** *(indépendante, fusionnable en premier, inerte)*
  - [x] Gemfile : `devise-i18n`, `i18n-tasks` (groupe dev/test)
  - [x] Constante `Elvis::SUPPORTED_LOCALES = %w[fr en].freeze` — posée dans
        `lib/elvis/supported_locales.rb` (pas `config/initializers/i18n.rb` comme envisagé
        initialement : elle doit être chargée avant le corps de classe de
        `config/application.rb`, qui s'exécute avant que les initializers ne tournent ; même
        pattern d'`require_relative` explicite que `lib/elvis/version.rb`)
  - [x] `config/application.rb` : lever le verrou de langue, activer `enforce_available_locales`
        (suppression des deux lignes `I18n.enforce_available_locales = false` /
        `I18n.config.available_locales = :fr` en bas de fichier, remplacées par
        `config.i18n.available_locales = Elvis::SUPPORTED_LOCALES` dans le corps de la classe)
  - [x] Migration `add_column :users, :locale, :string, limit: 10`
        (`db/migrate/20260825203427_add_locale_to_users.rb` — **`db/schema.rb` non régénéré à la
        main** faute d'environnement Ruby 3.3/Postgres local dans cette session ; il était déjà
        en retard de 2 migrations avant ce chantier. Lancer `rails db:migrate` dans un
        environnement correctement provisionné pour le régénérer.)
  - [x] `ApplicationController` : `around_action` de résolution de locale (cascade cookie → user →
        Parameter → défaut) — `switch_locale`/`resolve_locale`, posé en `prepend_around_action`
  - [x] `LocaleController` + route `PATCH /locale` (nommée `locale`) +
        `app/views/partials/_language_switcher.html.erb`
  - [x] `<html lang="...">` dans les 3 layouts (`application.html.erb`, `devise.html.erb`,
        `simple.html.erb`) + sélecteur de langue inclus dans chacun
  - [x] Config `i18n-tasks` (`.i18n-tasks.yml`)
  - [x] Nettoyage du contenu `en.yml` (résidu de scaffold Rails, jamais utilisé)
  - [x] `docs/I18n.md` (première version, backend uniquement)
- [x] **`feature/i18n-02-foundation-frontend`** *(indépendante, fusionnable tôt, inerte)*
  - [x] `yarn add i18next react-i18next i18next-browser-languagedetector`
        (`i18next@26.4.0`, `react-i18next@17.0.12`, `i18next-browser-languagedetector@8.2.1`)
  - [x] `yarn add -D i18next-parser` (`i18next-parser@9.4.0` — le binaire CLI qu'il installe
        s'appelle `i18next`, pas `i18next-parser`, script `yarn i18n:extract` ajusté en
        conséquence)
  - [x] `frontend/i18n/index.js` (init i18next, détection via `document.documentElement.lang`)
        câblé dans `frontend/packs/app.js` avant `ReactRailsUJS.useContext`. **Pas de lazy
        loading par namespace posé dans cette branche** : un seul namespace stub (`common`)
        existe pour l'instant, ça aurait été de la complexité spéculative ; à construire quand les
        branches d'extraction ajouteront de vrais namespaces par fonctionnalité.
  - [x] Config extraction (`i18next-parser.config.js` — sans le point en tête, c'est le nom par
        défaut cherché par le CLI `i18next`)
  - [x] `frontend/locales/{fr,en}/common.json` (stub, vérifié non écrasé par
        `yarn i18n:extract` sur les 317 fichiers actuels, qui ne contiennent encore aucun appel
        `t()`/`<Trans>`)
  - [x] Centraliser le changement de locale `moment` sur l'événement `languageChanged` d'i18next
        (`frontend/i18n/index.js`). **Les `require("moment/locale/fr")` dispersés dans ~10+
        fichiers ne sont pas encore retirés** — effet de bord documenté dans `docs/I18n.md`, à
        nettoyer au fil des branches d'extraction qui touchent ces fichiers.
  - [x] Compléter `docs/I18n.md` avec la partie frontend
- [x] **`feature/i18n-03-localization-settings`** *(dépend de 01+02)*
  - [x] `Parameters::LocalizationParametersController` (clone du pattern JSON
        `school_planning_params`/`update_school_planning_params` de `PlanningParametersController`)
  - [x] Route sous `namespace :parameters`
  - [x] Écran React `parameters/Localization/LocalizationParameters` (choix langue par défaut +
        langues disponibles, cases à cocher + select, pattern calqué sur
        `ApplicationParameters.jsx`)
  - [x] **Pas d'entrée `Elvis::MenuManager`** — en lisant `lib/elvis/menu_manager.rb`, ce
        mécanisme sert la navigation globale de l'app, pas la page `/parameters`. Les écrans de
        réglages individuels (École, Emails, Formules...) sont en réalité de simples cartes
        ajoutées dans `ParametersController#set_base_parameters`, qui alimentent la page
        `/parameters` déjà existante — c'est ce mécanisme qui a été utilisé (carte "Langues" sous
        `@parameters[:général]`), pas `Elvis::MenuManager` comme envisagé initialement dans ce
        plan.
  - [x] `ApplicationController#available_locales` (`helper_method`) : calcule
        `Elvis::SUPPORTED_LOCALES ∩ app.localization.available_languages` et remplace désormais
        `Elvis::SUPPORTED_LOCALES` dans `resolve_locale`, le sélecteur de langue
        (`_language_switcher.html.erb`) et `LocaleController#update` — sans ça, le réglage admin
        n'aurait aucun effet réel nulle part.
- [x] **`feature/i18n-04-devise-and-public-pages`** *(dépend de 01)*
  - [x] `app/views/devise/**` (connexion, inscription, mot de passe, confirmation, mailer
        `*.html.erb`/`*.mjml`, `shared/_links`, `shared/_error_messages`, `unlocks/new` —
        celui-ci était encore intégralement en anglais, jamais localisé depuis le scaffold Devise
        d'origine). Nouvelles clés sous `views.devise.<controller>.<action>.*`, en réutilisant
        directement les clés stock `devise.*` du gem `devise-i18n` partout où le texte de l'appli
        est identique ou quasi identique au texte par défaut du gem (ex. `devise.sessions.new.sign_in`
        pour "Connexion", `devise.passwords.edit.change_my_password`, `devise.mailer.*.action`) —
        n'ajoutant une clé projet que là où la copie a été réellement personnalisée. `registrations/edit.html.erb`
        avait un texte de confirmation en attente resté en anglais (`"Currently waiting confirmation
        for: ..."`) malgré le gem qui fournit déjà `devise.registrations.edit.currently_waiting_confirmation_for_email`
        en français — corrigé au passage en le branchant sur cette clé stock.
  - [x] `app/views/users/new_application.html.erb` — aucune chaîne en dur : c'est un pur point de
        montage React (`react_component('PreApplication', ...)`), rien à extraire côté ERB.
  - [x] `app/views/sessions/pick_user.html.erb` — nouvelles clés `views.sessions.pick_user.*`.
  - [x] Clés `devise-i18n` manquantes pour les champs custom : `activerecord.attributes.user.{last_name,
        first_name,birthday}` ajoutées à `fr.yml`/`en.yml` (le gem ne couvre que les attributs Devise
        standards). Le formulaire d'inscription garde son libellé spécifique ("Votre Nom", "Votre
        Prénom", "Votre date de naissance") via des clés `views.devise.registrations.registration.*`
        plutôt que de basculer sur le nom d'attribut générique, pour ne pas changer le texte visible
        pendant une extraction — ces trois clés `activerecord.attributes.user.*` restent donc
        statiquement "unused" pour l'instant (`ignore_unused` documenté dans `config/i18n-tasks.yml`),
        en attendant qu'un futur formulaire (ex. `UserEdit` en branche 05) s'appuie dessus.
  - [x] **Déviation non prévue** : `.i18n-tasks.yml` (posé en branche 01) n'était en réalité **jamais
        chargé** — cette version du gem (`i18n-tasks 1.1.2`) ne reconnaît que `config/i18n-tasks.yml`,
        `config/i18n-tasks.yml.erb`, `i18n-tasks.yml` ou `i18n-tasks.yml.erb` comme nom de fichier de
        config (voir `CONFIG_FILES` dans le gem), jamais un dotfile à la racine. Toute la config
        (search paths, `data.read` incluant `devise.<locale>.yml`, `ignore_missing`/`ignore_unused`)
        tournait donc silencieusement sur les valeurs par défaut du gem depuis la branche 01, sans
        qu'aucun rapport `health`/`missing`/`unused` ne s'en aperçoive. Déplacé vers
        `config/i18n-tasks.yml` (chemin de plus haute priorité dans `CONFIG_FILES`) dans cette
        branche, ce qui a immédiatement fait apparaître de vrais gains de précision (ex. les clés
        `time.formats.*`/`date.formats.*` françaises, jusque-là signalées "unused" à tort faute de
        scanner `lib/elvis/`, sont maintenant vues comme utilisées). `ignore_missing`/`ignore_unused`
        complétés avec `devise.**` (le `*` seul ne matche qu'un segment de clé, pas une clé
        `devise.mailer.x.y` à 4 segments — la doc du gem elle-même donne `devise.*` en exemple, ce
        qui ne fonctionne en réalité pas au-delà d'un niveau), `errors.messages.*` (autre namespace
        stock dupliqué en anglais seulement dans `devise.en.yml`, sans équivalent français
        nécessaire puisqu'il vient de `rails-i18n`) et `activerecord.attributes.user.password`
        (attribut stock du gem référencé directement via `t()` dans les vues touchées).
  - [x] **Nettoyage post-revue** : suppression des deux templates `.mjml` de `devise/mailer/`
        (mort — aucun gem `mjml`/`mjml-rails` au `Gemfile`, jamais rendus), ce qui a aussi retiré
        au passage le nom de produit "Ziggy" resté dans `reset_password_instructions_mjml.mj_title`.
        `bundle exec i18n-tasks health` rapporte désormais 0 manquant / 0 inutilisé (contre 2/22
        avant ce nettoyage). Ajout de `bin/i18n-tasks` (binstub Bundler + `require "logger"`) car
        Ruby 3.3.5+/3.4 a démoté `logger` en gem "bundled" — la CLI `i18n-tasks` ne bootant pas
        Rails, elle ne le charge jamais implicitement et plantait sans ce require explicite. Deux
        bugs de markup trouvés en revue et corrigés : `unlock_instructions.html.erb` construisait
        son `href` à partir du HTML rendu par un `link_to` imbriqué au lieu de l'URL elle-même (bouton
        cassé) ; `confirmation_instructions.html.erb` doublait le `<strong>` autour du nom de
        l'appli (le call site *et* la clé `_html` l'enveloppaient chacun). Couverture de tests
        ajoutée : `spec/mailers/devise_mailer_spec.rb` (confirmation/reset password, fr+en, garde-fou
        de non-régression sur les deux bugs ci-dessus) et `spec/requests/devise_pages_spec.rb`
        (sign_in/sign_up/password new+edit/pick_user, fr+en, aucune clé de traduction brute qui
        fuite) — ce dernier nécessitait `yarn` pour que Shakapacker compile son manifest de test,
        absent de la machine de dev jusqu'à activation via `corepack enable`.
- [x] **`feature/i18n-05-extract-users`** *(dépend de 01+02, indépendante de 04)* — vague de preuve
      de bout en bout
  - [x] `frontend/components/UserList.jsx` (class component → `withTranslation`) — export par
        défaut enveloppé dans `withTranslation("users")`, accès via `this.props.t("users:list...")`
        dans les méthodes de classe. Premier composant du repo à réellement utiliser
        l'infrastructure i18next posée en branche 03 (`LocalizationParameters.jsx` de la branche 03
        restait 100% en dur) — établit le pattern HOC de zéro, aucun précédent en base.
  - [x] `frontend/components/UserEdit.jsx` — même traitement (`withTranslation("users")`,
        `t("users:edit...")`), limité au texte propre à ce fichier (titre de page, titre d'erreur
        swal, en-têtes des 3 onglets `TabbedComponent`). `LevelInfos`/`UserForm`/
        `TabbedComponent`/`Roles`, montés par ce composant, restent hors périmètre.
  - [x] Nouveau namespace i18next `users` : `frontend/locales/{fr,en}/users.json` (68 clés chacun,
        parité vérifiée), câblé dans `frontend/i18n/index.js` (`resources.{fr,en}.users`, ajout à
        `ns: [...]`) selon le pattern déjà utilisé pour `common`.
  - [x] `app/views/users/**` — 15 des 18 fichiers du dossier (tous sauf `hours_sheet.html.erb`,
        `new_application.html.erb`, déjà traités/vides, et `edit.html.erb` qui s'est confirmé être
        un pur point de montage React sans chaîne en dur). Nouvelles clés sous
        `views.users.<vue>.*`. Un doublon verbatim ("Valider" ×3) a justifié la création du tout
        premier namespace `common.actions.*` côté backend (`common.actions.validate`) — les
        branches 01-04 n'en avaient pas eu besoin. Réutilisation de
        `activerecord.attributes.user.*` (nouvelles clés `is_admin`/`is_teacher`/`adherent`
        ajoutées) au lieu de dupliquer "Administrateur"/"Professeur"/"Adhérent" entre `new.html.erb`
        et `show.html.erb`.
  - [x] Traduction anglaise complète de ce périmètre (première langue seconde prouvée de bout en
        bout) — toutes les clés `views.users.*`/`common.actions.validate` posées dans `fr.yml` et
        `en.yml` en même temps, toutes les clés `users.json` posées dans les deux locales frontend
        en même temps ; parité vérifiée par script (aucune clé orpheline dans un sens ou l'autre).
  - [x] **Bug réel détecté par les tests** : `app/views/users/new.html.erb` utilise
        `form_with scope: :user` (pas d'instance liée), donc `f.label :is_admin` etc. ne pouvait pas
        résoudre `object.class` pour retomber sur `activerecord.attributes.user.*` — le libellé
        retombait silencieusement sur la version humanisée anglaise du nom d'attribut ("Is admin")
        même en français. Corrigé en appelant explicitement `User.human_attribute_name(:is_admin)`
        etc. comme contenu du label dans ce fichier. Détecté par le spec `users#new` ajouté pour
        cette branche, pas repéré à la première passe d'extraction.
  - [x] **Correction au passage** : `app/views/users/show.html.erb` passait `title: 'Error'` en dur
        (anglais, non traduit) dans les `swal_props` du montage `SwalBackEndModal` — remplacé par
        `t("views.users.show.error_title")` conformément à la règle "un composant React ne reçoit
        qu'une chaîne déjà interpolée, jamais une clé brute".
  - [x] **Déviation mineure vs. le plan initial** : `hours_sheet.html.erb` fait en réalité 119
        octets/1 ligne (un unique `react_component("HoursSheet", {...})`), pas 0 octet comme
        indiqué initialement dans le brief de cette branche — le constat de fond ("rien à extraire")
        reste correct, seule la description physique du fichier était légèrement fausse.
  - [x] **Nouveaux tests** : `spec/requests/users_pages_spec.rb` (RSpec, pattern identique à
        `devise_pages_spec.rb` — rendu `users#index`/`show`/`new` en fr/en via le cookie `locale`,
        assertions sur du texte traduit réel, garde anti-`"translation missing"`) ;
        `frontend/components/UserList.test.jsx` et `UserEdit.test.jsx` (Vitest,
        `@testing-library/react`). **Pattern de bascule de langue en test établi pour les
        prochaines branches** : appeler `i18n.changeLanguage("en"|"fr")` directement sur le
        singleton exporté par `frontend/i18n/index.js` (câblé comme instance par défaut de
        `react-i18next` via `initReactI18next`) suffit pour un composant classe enveloppé de
        `withTranslation()` — pas besoin d'envelopper le rendu dans un `<I18nextProvider>` explicite
        dans le test.
  - [x] **Vérification** : `bin/i18n-tasks health` → 0 manquant / 0 inutilisé (le seul résidu, une
        demande de `normalize`, préexistait à cette branche — vérifié par `git stash`). `bundle exec
        rspec` → 86 exemples, 0 échec (83 avant cette branche + 3 nouveaux). `yarn test` → 5
        fichiers/15 tests, tous verts. Vérification visuelle en navigateur (`foreman start`) **non
        effectuée** dans cette session. La chaîne d'outils Ruby cassée signalée par l'agent frontend
        pendant cette branche (`bundle`/`bin/shakapacker` en échec, gem source Git non checkoutée)
        s'est révélée être un artefact d'environnement de cet agent précis (résolution `PATH`
        incorrecte faisant pointer `ruby`/`bundle` vers l'installation Homebrew du système au lieu
        de celle gérée par `asdf`), pas un vrai problème du dépôt — `bundle check` fonctionne
        normalement une fois `ruby`/`bundle` correctement résolus. `yarn build`, en revanche, était
        un vrai bug préexistant du dépôt (`react-scripts: command not found` — script obsolète
        jamais mis à jour lors du passage à `shakapacker`) et a été corrigé séparément juste après
        cette branche (`package.json` `build` pointe maintenant vers `bin/shakapacker` en
        `RAILS_ENV=production`, vérifié : produit un vrai bundle webpack). La vérification visuelle
        en navigateur reste à faire dès qu'un environnement `bin/shakapacker`/serveur Rails complet
        est disponible.
- [ ] **Dette repérée en revue de la branche 05, à traiter avant/pendant une branche qui rend un
      composant `withTranslation()` en SSR** : `frontend/packs/server_rendering.js` n'importe pas
      `../i18n` (contrairement à `app.js`). Sans effet tant que les composants traduits sont montés
      sans `prerender: true` (cas de `UserList`/`UserEdit`), mais le premier `react_component`
      d'un composant enveloppé de `withTranslation()` rendu côté serveur lèvera faute d'instance
      i18next. À corriger avec précaution : l'init `frontend/i18n/index.js` s'appuie sur le
      détecteur `htmlTag` (`document.documentElement.lang`), absent en contexte SSR — prévoir un
      garde-fou / une locale explicite plutôt qu'un simple `import`.
- [ ] **`feature/i18n-06-extract-<domaine>`** *(répétable, mutuellement indépendantes, ~15-30
      fichiers chacune)* — une branche par domaine, dans n'importe quel ordre :
  - [~] `planning` — **le plus gros domaine du chantier** (~10 vues ERB + ~10 000 lignes de React,
        dont `Planning.jsx` 1792 l. et `ActivityDetailsModal.jsx` 2053 l.). Découpé en lots
        empilés, un PR par lot (même approche que `payments`) :
    - [x] **Lot 1 — vues ERB** : branche `feature/i18n-06-extract-planning`. Tous les
          `app/views/planning/*.erb` : titres, alertes de date-limite de validation, boutons
          verrouiller/déverrouiller, labels/messages des `ConfirmLink`. Clés backend sous
          `views.planning.*` (`actions.{lock_the_planning,unlock_the_planning,edit}` réutilisées
          entre 3 vues ; `validation_alert.{warning,teacher,admin}` partagées entre `show` et
          `show_generic` ; le reste par vue). Interpolation Rails `%{...}` (dates, saison, nom du
          prof). `show_all_rooms.html.erb` / `show_simple.erb` = purs points de montage
          `react_component`, rien à extraire. **Pas encore de namespace i18next `planning`** (lot 1
          n'a aucune chaîne React) — il sera créé au premier lot React. 3 fautes de frappe
          préservées verbatim, consignées dans `docs/KnownIssues.md` (« Creer », « verouiller »,
          « Resolution »). Tests : `spec/requests/planning_pages_spec.rb` couvre `index_for_rooms`
          / `index_for_teachers` en fr+en ; les vues `show*` ont besoin d'une `Season` courante
          persistée + gros fixtures par action (même blocage « factory Season » que la branche
          evaluation) — différées, clés vérifiées par `bin/i18n-tasks health` (0/0). Vérification :
          health 0 manquant / 0 inutilisé (467 clés).
    - [x] **Lot 2a — composants feuilles simples** : branche
          `feature/i18n-06-extract-planning-modals`. `PauseDetailModal`, `QuestionnaireModal`,
          `RoomActivitiesListModal`, `SelectTeachers` (fonction → `useTranslation`) ;
          `StudentModal`, `SelectActivity`, `YearlyCalendar`, `RawPlanning` (classe →
          `withTranslation("planning")`). **Crée le namespace i18next `planning`**
          (`frontend/locales/{fr,en}/planning.json`, câblé dans `frontend/i18n/index.js` +
          `index.test.js`). Clés sous `planning.<composant>.*` + partagées `planning.common.close`
          et `planning.kinds.{course,option}` (réutilisées entre `StudentModal` et
          `YearlyCalendar`). `QuestionnaireModal` réutilise `common:reactTable.loadingText` ;
          `StudentModal` réutilise `common:actions.save`. `RawPlanning` : `t` passé en prop aux
          sous-composants module-level `RawActivity`/`OptionItems`. `SelectLocation.jsx` : aucune
          chaîne visible, non touché. Interpolation `{{n}}`/`{{limit}}`/`{{label}}` (jamais
          `{{count}}`). 1 faute préservée verbatim (`studentModal.title` « Selection »), consignée
          dans `docs/KnownIssues.md`. Tests : `frontend/components/planning/PlanningModals.test.jsx`
          (9 tests, fr+en). `yarn test` → 26 fichiers / 71 tests verts. **Revue `/code-review` :
          1 bug corrigé (`YearlyCalendar` importait `withTranslation` mais l'export n'était pas
          enveloppé → `t is not a function` au rendu ; commit `5e36a87`, + cas de test de
          non-régression).
    - [x] **Lot 2b — modales à helpers module-level** : branche
          `feature/i18n-06-extract-planning-modals-2`. `CreateActivityModal` (classe
          `CreateIntervalModal`), `EvaluationModal`, `MultiViewModal` → `withTranslation("planning")`.
          `MultiViewModal` fait descendre `t` en prop dans `AvailabilityIntervalContent` /
          `ValidatedIntervalContent` / `TeacherItem` (helpers module-level) ; `EvaluationModal`
          n'a besoin de rien de tel (ses chaînes sont des props `label=` passées depuis
          `render()`). Nouvelles clés `planning.{createActivityModal,evaluationModal,multiViewModal}.*`
          + `planning.kinds.{evaluation,pause}` ; réutilise `planning.kinds.course`,
          `planning.common.close`, `common:actions.{cancel,save,delete}` (59 clés au total,
          parité fr/en exacte, 61 après revue). Les deux orthographes « Elève »/« Élève »
          d'`EvaluationModal` unifiées sur `evaluationModal.student` = « Élève » ; par cohérence
          (revue `/code-review`), `kinds.evaluation` et `multiViewModal.students` corrigés de même
          (« Evaluation » → « Évaluation », « Elèves » → « Élèves ») — consigné dans
          `docs/KnownIssues.md`. `renderStudentOptions` (code mort) laissé tel quel.
          Le message riche « Veuillez aller sur la page **Gestion des évaluations** pour valider… »
          découpé en 3 clés autour du `<strong>` conservé dans le JSX. Connecteurs « de »/« à » du
          résumé de créneau (vue admin récurrence) extraits en `createActivityModal.timeFrom/timeTo`
          (ratés à la 1re passe, repérés en revue). Tests :
          `frontend/components/planning/PlanningModals2b.test.jsx` (6 tests, fr+en, dont la vue
          admin récurrence via `userEvent.click`). `yarn test` → 27 fichiers / 77 tests verts.
    - [x] **Lot 3a** : branche `feature/i18n-06-extract-planning-simple`. `SimplePlanning.jsx`
          (classe → `withTranslation("planning")`, `t` descendu en prop dans `SimpleActivity`
          module-level + le fils `SimpleEvaluation`). 1 nouvelle clé
          `planning.simplePlanning.evalBadge` (« EVAL ») ; le reste réutilise
          `rawPlanning.{occupancy,noActivityThisWeek}`, `evaluationModal.readSelfAssessment`,
          `common:reactTable.loadingText`. `TimeInterval.jsx` : aucune chaîne visible, non touché.
          Test : `SimplePlanning.test.jsx` (2, fr+en). `yarn test` → 81 tests verts.
    - [x] **Lot 3b** : branche `feature/i18n-06-extract-planning-calendar`. **`Calendar.jsx`
          uniquement** (`TimeIntervalHelpers.jsx` sorti du périmètre — voir lot 3c). `CustomCalendar`
          → `withTranslation("planning")` ; `t` descendu (via prop / options) dans `getTimeTemplate`
          (templates HTML `tui-calendar`) et `CalendarControls`. Nouvelles clés
          `planning.scheduleTitles.*` (« Disponibilité », « Dispo. Option/Cours/Evaluation »,
          « Privé » — corrigé de « Private » sur signalement revue) et `planning.calendar.*` (`daynamesShort` en
          tableau JSON via `t(..., {returnObjects:true})`, `moreSchedules` `{{n}}`, `presences`,
          `substituteFor`, `views.{month,week,day}`, `tooltips.{seasonStart,today,nextSeason}`,
          `hoursSummary` `{{lesson}}/{{option}}`). Réutilise `kinds.pause`,
          `multiViewModal.replacedBy`, `common:reactTable.loadingText`. `moment.locale("fr")` codé
          en dur dans `calculateTotalHours` supprimé (la locale moment est centralisée dans
          `frontend/i18n/index.js`). `ConflictDisplayItem` = code mort (jamais rendu) → laissé,
          consigné dans KnownIssues. `getTimeTemplate` et `CalendarControls` exportés pour le test
          (tui-calendar ne monte pas proprement en jsdom). Test : `Calendar.test.jsx` (7, fr+en —
          vue mois, vue semaine/jour, ligne remplaçant). `yarn test` → 30 fichiers / 90 tests.
          **Revue `/code-review`** : `calculateTotalHours` passé à `isoWeek` (fenêtre du total
          d'heures alignée sur la grille lundi-début quelle que soit la locale) ; template `time:`
          lit `this.props.t` (titres de créneaux suivent la langue au re-render) ;
          `scheduleTitles.private` corrigé en « Privé » ; couverture branche non-mois ajoutée.
          Résidu consigné (KnownIssues) : `daynames` + templates `function` figés au mount.
    - [ ] **Lot 3c** : `TimeIntervalHelpers.jsx` — module de helpers **purs** partagés
          (`formatIntervalsForSchedule` titres « Disponibilité »/« Dispo. Evaluation »/« Evaluation » ;
          `levelDisplay` « NON INDIQUÉ » / « À PRÉCISER » ; `averageAgeDisplay`). Appelé depuis
          `Planning.jsx` (lot 4), `courses/LessonList.jsx`, `activityApplications/summary/Activity.jsx`,
          `RawPlanning`, `TimeInterval`, `SimplePlanning` — donc `t` à faire descendre dans **4+
          domaines**. À traiter comme une passe transverse dédiée (comme `feature/i18n-common-react-table-keys`),
          pas dans un lot planning.
    - [x] **Lot 4** : branche `feature/i18n-06-extract-planning-container`. `Planning.jsx`
          (1792 l., conteneur) → `withTranslation("planning")`. Toutes les chaînes vivent dans ses
          propres méthodes/`render()` (toasts — dont plusieurs JSX + interpolés, bandeau vacances,
          barre de filtres, `contentLabel` des modales) → aucun `t` à faire descendre. Nouvelles
          clés sous `planning.container.*` (`toasts.*` ~17, `entities.{room,teacher,unknown}`,
          `modals.*`, bandeau/filtres) ; interpolation `{{updated}}/{{conflicts}}/{{success}}/{{entity}}`
          (jamais `{{count}}`). Réutilise `common.close`, `common:actions.{cancel,confirm}`,
          `pauseDetailModal.title`. Interpolation sous-lexicale `typeLabel` (« salle »/« professeur »/
          « entité inconnue » injecté dans « Changement de … ») résolue via `entities.*` + une clé
          `entityChanged` avec `{{entity}}`. 4 fautes/incohérences préservées verbatim (contentLabels
          « Detail »/« Creation », « Echec », deux variantes de « cours mis à jour ») consignées dans
          `docs/KnownIssues.md`. Test : `Planning.test.jsx` (2, fr+en — bandeau + barre de filtres ;
          `Calendar` et `ActivityDetailsModal` mockés, `generic` pour couper le fetch au mount).
          `yarn test` → 30 fichiers / 92 tests. Namespace `planning.json` = 108 clés, parité fr/en.
    - [x] **Lot 5** : branche `feature/i18n-06-extract-planning-activity-modal`.
          `ActivityDetailsModal.jsx` (2053 l., ~11 composants dans un seul fichier). Les 4 classes
          (`ActivityDetailsModal` exportée → `withTranslation("planning")` ; `AttendanceTable`,
          `EditGroupNameInput`, `ActivityEdition` internes → `t` descendu en prop depuis
          `ActivityDetailsModal.render()`) ; les 7 composants fonction → `useTranslation("planning")`.
          `const { t } = this.props` ajouté aux 4 `render()`/méthodes concernées. 56 clés sous
          `planning.activityModal.*` (sous-arbres `tabs`, `scope`, `attendanceTable`,
          `teachersEditor` ; message de conflit prof interpolé `{{name}}/{{from}}/{{to}}`).
          Réutilise `common:actions.save`, `planning.calendar.substituteFor`. **Traduction : agent
          `translator`** (parité 164/164) ; 3 fautes préservées verbatim (`Editer`, `A PRECISER`,
          `Elève`) + espaces de fin intentionnels, consignées dans `docs/KnownIssues.md`.
          `TeachersEditor` (composant) et `renderTeacherSelection` (méthode) = code mort (jamais
          rendus/appelés) — extraits quand même, consignés. `TimeSelection`/`LocationSelection`/
          `RoomSelection`/`TeacherCoveringEditor` exportés pour le test (le modal ne monte pas en
          jsdom). Test : `ActivityDetailsModal.test.jsx` (agent `qa`).
    - [x] **Lot 6** : branche `feature/i18n-06-extract-planning-subtrees`.
      - `practice_planning/` (le seul vivant) : `PracticePlanning.jsx` (monté par
        `app/views/practice/planning/index.html.erb`) + ses 2 modales `PracticeHandleSessions` /
        `PracticeMultiViewModel` → `withTranslation("planning")`, `t` lu dans `render()` (prop
        pour les modales). Nouvelles clés `planning.practice.*` (11) ; réutilise
        `activityModal.{roomLabel,startLabel,endLabel}`, `multiViewModal.group`,
        `container.modals.slotDetail`, `common:actions.{cancel,save,delete}`. Données de démo
        (`RESSOURCES`/`ROOMS`/`BANDS`/`INITIAL_EVENTS` — « Stax », « Rolling Stones »,
        « All-day event »… référencées nulle part) NON traduites. `locale="fr"` de FullCalendar
        laissé tel quel — mais inerte (aucune locale FullCalendar importée → repli sur l'anglais) :
        consigné dans `docs/KnownIssues.md`. Traduction : agent `translator`. Test : agent `qa`
        (dont un garde-fou `WrappedComponent` sur `PracticePlanning`). L'alerte « salle déjà
        occupée » d'`ActivityDetailsModal.jsx` (ratée au lot 5) extraite au passage
        (`activityModal.roomBusy`, parité 176/176).
      - `activity_management/` : **tout le sous-arbre est mort sauf `withSave`** (le container
        `ActivityManagement` n'est monté nulle part ; `ActivityDetailsModal.jsx` a ses propres
        copies inline des composants). Non traduit, consigné dans `docs/KnownIssues.md`.
    - **Domaine `planning` — extraction terminée**, sauf :
      - **Lot 3c** (`TimeIntervalHelpers.jsx`) — toujours à faire : passe transverse dédiée
        (« Evaluation »/« Dispo. Evaluation »/« Disponibilité » titres de créneaux, « NON INDIQUÉ »/
        « À PRÉCISER » de `levelDisplay`) ; helper appelé depuis 4+ domaines.
      - `ConflictDisplayItem` de `Calendar.jsx` (« Résolu »/« Voir le conflit ») — code mort,
        déjà consigné dans `docs/KnownIssues.md`.
  - [~] `activities` — domaine plus large que prévu (catalogue d'activités). Découpé :
    - [x] **Lot 1 — CRUD admin catalogue** : branche `feature/i18n-06-extract-activities`.
          `frontend/components/activities/{ActivityRefKind,Instruments}.jsx` (classes ext.
          `BaseDataTable` → `withTranslation("activities")`, nouveau namespace i18next `activities`).
          `app/views/activity_ref/{index,edit,new}.html.erb` +
          `app/views/activity_ref_kind/{index,new,_form}.html.erb` +
          `app/views/instruments/{index,new,_form}.erb` → clés `views.activity_ref.*` /
          `views.activity_ref_kind.*` / `views.instruments.*`. Réutilise
          `common.actions.{save,edit,delete}`, `common.confirm.sure`. Traduction : agent
          `translator`. Test : agent `qa` (+ test de parité fr/en générique dans
          `frontend/i18n/index.test.js`, ajouté sur signalement revue). Colonnes construites dans
          le constructeur (figées à la langue de montage) — consigné. Anomalies préservées
          verbatim (`Editer` → `Éditer` ; `destroy_error_title` = « Error » en dur ;
          `Nom_de_l'instrument` ; « Ajouter une Activité »/« activité » casse incohérente) —
          consignées. `f.label` corrigé pour prendre `:attr, texte` (pas `texte` seul).
          **NB** : `parameters/BaseDataTable.jsx` (classe de base des 2 tableaux) a son propre
          chrome FR en dur (« Créer » + props react-table) alors que `common:reactTable.*` existe
          déjà — à faire quand le domaine `parameters` sera traité, pas ici.
    - [ ] **Lot 2 — `activityRef/ActivityRefContainer`** (formulaire édition/création d'activité,
          gros arbre React sous `frontend/components/activityRef/`).
    - [ ] **Lot 3** — `app/views/{activity,activity_instance,my_activities,activities_applications}/*`
          + `frontend/components/activityApplications/*` (flux d'inscription côté élève — gros).
  - [x] `evaluation` — branche `feature/i18n-06-extract-evaluation` *(dépend de 01+02)*
    - [x] `frontend/components/evaluation/` : `Evaluation.jsx`, `EvaluationForm.jsx`,
          `StudentEvaluationsStats.jsx` passés en `withTranslation("evaluation")` (nouveau
          namespace i18next `evaluation` — `frontend/locales/{fr,en}/evaluation.json`, câblé dans
          `frontend/i18n/index.js`). `EvaluationForm` est importé par ~6 composants des domaines
          `planning`/`activityApplications` — le HOC est transparent pour eux (prop `submitLabel`
          explicite toujours prioritaire, exports nommés `validateQuestions` etc. inchangés).
          `EvaluationMenu.jsx` et `question/*` : aucune chaîne en dur propre à ce périmètre
          (seulement `MESSAGES.no_answer` de `tools/constants`, partagé, hors périmètre ; plus un
          message d'erreur dev `TARGET … NOT SUPPORTED` dans `select_question.jsx`, laissé en
          anglais comme les `console.error`). `select_targets.jsx` : les champs `label:`
          ("Niveaux", "Saisons", …) sont **du code mort** — `select_question.jsx` ne lit que
          `setName`/`valueAccessor`/`labelAccessor` — laissés tels quels, pas traduits.
    - [x] `app/views/` : `evaluation_appointments/incomplete.html.erb`,
          `evaluation_level_ref/{index,new,edit}.html.erb`, `student_evaluations_stats/stats.html.erb`.
          Clés sous `views.evaluation_appointments.*` / `views.evaluation_level_ref.*` /
          `views.student_evaluations_stats.*`. Nouveaux `common.actions.{save,add,edit}` (doublons
          verbatim "Sauvegarder"/"Ajouter"/"Éditer"). `activerecord.attributes.evaluation_level_ref.{label,value}`
          ajoutés et référencés via `t()` explicite dans `f.label` (le formulaire est
          `form_with scope:` sans instance liée fiable — même raison que `users/new.html.erb` en
          branche 05 — donc `f.label :label` seul ne résout pas la clé) ; statiquement détectés,
          pas besoin d'`ignore_unused`.
    - [x] **Vues scaffold supprimées** : `evaluation_level_ref/{create,update}.html.erb`
          (stubs Rails "Find me in…", `create`/`update` `redirect_to` inconditionnellement). Ces
          deux suppressions sont **consignées pour récupération éventuelle** dans
          `docs/KnownIssues.md` (section « Scaffold views suspected dead ») — récupérables via
          `git show 48a6208^:app/views/evaluation_level_ref/create.html.erb`. Politique révisée
          ensuite : les branches i18n **ne suppriment plus de vues**, elles consignent seulement
          les suspectes. `show.html.erb` (stub identique) laissé en place.
    - [x] **Bugs préexistants corrigés dans `evaluation_level_ref/edit.html.erb`** (formulaire
          d'édition cassé, découvert en écrivant le spec) : `model: @evalution_level_ref` (faute de
          frappe → `nil`, champs jamais préremplis) → `@evaluation_level_ref` ; et
          `url: evaluation_level_ref_path` sans id → `evaluation_level_ref_path(@evaluation_level_ref)`
          (route membre, levait `UrlGenerationError` au rendu).
    - [x] **Correction au passage (revue)** : `new.html.erb`/`edit.html.erb` avaient
          `id: "label"`/`id: "value"` en dur sur les `text_field`, qui ne correspondaient pas au
          `for` généré par `f.label :label`/`:value` (`for="evaluation_level_ref_label"` etc.) —
          même classe de défaut que le finding #6 de la branche 05. Overrides `id:` supprimés pour
          que Rails régénère un id cohérent avec le `for` ; aucun JS ne visait les anciens ids.
    - [x] **Tests** : `spec/requests/evaluation_pages_spec.rb` (index/new/edit `evaluation_level_ref`,
          fr/en, interpolation du libellé dans le titre d'édition, garde anti-`"translation missing"`) ;
          `frontend/components/evaluation/{Evaluation,EvaluationForm,StudentEvaluationsStats}.test.jsx`
          (Vitest, même pattern `i18n.changeLanguage` que la branche 05). **Non couvert**
          (documenté dans le spec) : `student_evaluations_stats#stats` et
          `evaluation_appointments#incomplete` nécessitent une `Season` `is_current` persistée, et
          il n'existe pas encore de factory `Season` (le modèle a des validations de présence +
          inter-dates qui rendent un build inline lourd). Une seule chaîne de titre extraite pour
          chacune ; câbler une fixture `Season` est un TODO de suivi.
    - [x] **Vérification** : `bin/i18n-tasks health` → 0 manquant / 0 inutilisé (365 clés).
          `bundle exec rspec` → 93 exemples, 0 échec. `yarn test` → 8 fichiers / 22 tests, verts.
  - [ ] `courses` — branche `feature/i18n-06-extract-courses` *(dépend de 01+02 ; réutilise `planning:*`)*
    - [x] **Lot 1** — assistant « Ajouter un cours » (3 fichiers, `frontend/components/courses/`) :
          `AddCourse.jsx`, `AddCourseSummary.jsx`, `AddActivityForCourse.jsx`. Nouveau namespace
          i18next `courses` (`frontend/locales/{fr,en}/courses.json`, 28 clés, câblé dans
          `frontend/i18n/index.js` + assertion `ns` de `index.test.js`). Clés sous `addCourse.*` /
          `addActivity.*` / `addSlot.stepName` / `addTeacher.stepName` / `addLocation.stepName` /
          `summary.*`. Réutilise `planning:container.holidaysAlert` /
          `planning:container.manageHolidaysLink` / `planning:common.close` (bloc d'alerte vacances,
          même précédent que `Planning.jsx`) et le nouveau `common:loading` (« Chargement... »,
          extrait du loader pleine page — remplace un emprunt à `common:reactTable.loadingText`).
    - [x] **Correction de revue (finding HIGH)** : `AddActivityForCourse` est une *étape* StepZilla ;
          StepZilla ne branche son hook `isValidated()` par étape que si l'élément est
          `instanceof Component`, et un HOC `withTranslation()` (composant fonction) casse ce test —
          validation d'étape silencieusement désactivée. Laissé en classe nue non wrappée, `t`
          passé en prop depuis `AddCourse`. Test de non-régression ajouté.
    - [x] **Tests** : `frontend/components/courses/{AddCourse,AddCourseSummary,AddActivityForCourse}.test.jsx`
          (Vitest, pattern `i18n.changeLanguage`, fr + en), 10 tests.
    - [x] **Vérification** : `yarn test` → 36 fichiers / 129 tests, verts.
          `bin/i18n-tasks health` → 0 manquant / 0 inutilisé (aucun `.yml` touché ce lot).
    - [x] **Lot 2** — branche `feature/i18n-06-extract-courses-lot2`. Étapes « lieu » et
          « professeur » de l'assistant : `AddLocationForCourse.jsx` + `AddTeacherForCourse.jsx`,
          classes StepZilla nues, `t` passé en prop depuis `AddCourse`. +11 clés `courses`
          (`addLocation.*` / `addTeacher.*`, 39 au total, parité fr/en). `addTeacher.slotBusy` /
          `addTeacher.availableInstead` portent de l'interpolation
          (`{{activity}}`/`{{start}}`/`{{end}}`/`{{room}}`). Réutilise `addLocation.stepName`,
          `addTeacher.stepName`, `common:actions.validate`. Litéral template de `slotBusy` avait
          un retour à la ligne + indentation parasites (normalisés) et `professeur:` sans espace
          insécable (préservé verbatim, consigné dans `docs/KnownIssues.md`). Tests Vitest
          (2 fichiers, gardes classe-nue + résolution des clés interpolées), 12 tests.
          **Vérification** : `yarn test` → 38 fichiers / 141 tests, verts.
    - [x] **Lot 3** — branche `feature/i18n-06-extract-courses-lot3`. Étape « créneau » de
          l'assistant + modale de suppression : `AddSlotForCourse.jsx` (classe StepZilla nue,
          `t` en prop depuis `AddCourse`) + `DeleteCourseModal.jsx` (modale react-final-form
          autonome montée par `LessonList`, donc `withTranslation("courses")` ; le closure
          `onSubmit` est défini dans `render()` et récupère `t` de cette portée). +27 clés
          `courses` (`addSlot.*` avec un bloc `weekdays.{monday..saturday}`, nouveau bloc
          `deleteCourse.*` ; 66 au total, parité fr/en). Réutilise
          `common:actions.{cancel,validate}`. `deleteCourse.prompt` garde le source verbatim
          « Souhaitez-vous: » (espace manquant avant `:`), consigné dans `docs/KnownIssues.md`.
          Tests Vitest (2 fichiers, gardes classe/HOC + branche swal du `onSubmit`), 7 tests.
          **Vérification** : `yarn test` → 40 fichiers / 148 tests, verts.
    - [ ] **Lot 4** — `LessonList.jsx` (1415 lignes).
  - [x] `formules` — branche `feature/i18n-06-extract-formules` *(dépend de 01+02)*
    - [x] `frontend/components/formules/` : `Formules.jsx` (liste + swal archive/suppression) et
          `EditFormule.jsx` (formulaire créer/éditer, modale d'ajout d'activités, tableau de
          tarifs) passés en `useTranslation("formules")` (nouveau namespace i18next `formules` —
          `frontend/locales/{fr,en}/formules.json`, câblé dans `frontend/i18n/index.js`). Clés sous
          `formules.list.*` / `formules.form.*`. Réutilise `common:actions.{save,validate}`,
          `common:confirm.sure` et `common:reactTable.*` (⚠️ `Formules.jsx` disait `rowsText="lignes"`
          en dur — remplacé par la clé partagée `common:reactTable.rowsText` = « résultats » / « results »,
          léger changement de libellé assumé, même choix que lot 2c-i pour « Précédent »).
    - [x] `EditFormule.jsx` : l'interpolation sous-lexicale `actionType` (« création »/« modification »
          injectée dans « Erreur de … » / « … lors de la … de la formule ») supprimée au profit d'une
          sélection à deux clés (`isCreating ? t(...Create) : t(...Edit)`), grammaticalement sûre en
          anglais. Idem « La formule a été créée/modifiée avec succès ». Le helper module-level
          `CreateButton` (label en dur « Créer un tarif ») remplacé par une closure inline dans le
          composant pour accéder à `t`.
    - [x] `app/views/formules/{index,new,edit}.html.erb` : seuls les `<h2>` contenaient du texte —
          clés `views.formules.{index,new,edit}.heading` (fr.yml + en.yml, « formule » → « package »
          comme dans `payments.json`). `show.html.erb` = pur point de montage `react_component`,
          rien à extraire.
    - [x] `NewFormule.jsx` + `NewFormulePricingDataService.js` : `NewFormule` (composant) monté
          nulle part — écran « créer » historique remplacé par `EditFormule`. **Non traduit, laissé
          en place** (politique recover-don't-delete) ; consigné dans `docs/KnownIssues.md`
          (« `formules/NewFormule.jsx` — dead »). `NewFormulePricingDataService` reste utilisé par
          `EditFormule`.
    - [x] Pas de composant `formules/*` rendu en SSR (`prerender`) — la dette
          `server_rendering.js` (ligne ~355) ne bloque donc pas cette branche.
    - [ ] **Tests** : `Formules.test.jsx`, `EditFormule.test.jsx` (Vitest, pattern `i18n.changeLanguage`),
          `spec/requests/formules_pages_spec.rb` (index/new/edit fr+en, garde anti-`"translation missing"`).
    - [ ] **Vérification** : `bin/i18n-tasks health`, `bundle exec rspec`, `yarn test`, `/code-review`.
  - [ ] `parameters` / `editParameters` restants — inclut aussi : `parameters/BaseDataTable.jsx`
        (chrome FR en dur, cf. lot activities 1), `parameters/Practice/Instruments.jsx` (2e
        tableau « Instruments » distinct, colonnes `#`/`Nom`/`Actif ?`/`Actions`, encore en FR).
  - [~] `payments` — **branche `feature/i18n-06-extract-payments` : 1er lot fait, reste à
        découper.** Le domaine `payments` est bien plus gros que les autres (~19 vues ERB, ~31
        composants React), donc découpé :
    - [x] **Lot 1 (cette branche) — écrans d'admin CRUD + imports ratés** :
      - [x] `app/views/payment_method/{index,new,edit,_form}.html.erb`,
            `app/views/payment_statuses/{index,new,edit,_form}.html.erb`,
            `app/views/payments/index.html.erb`,
            `app/views/failed_payment_imports/index.html.erb`. Clés sous
            `views.payment_method.*` / `views.payment_statuses.*` / `views.payments.index.*` /
            `views.failed_payment_imports.index.*`. Nouveaux `common.actions.{delete,back}`,
            `common.labels.actions`, `common.confirm.sure` (les deux `data: { confirm: "Êtes vous
            sur ?" }` des vues index ; deux fautes dans l'original — trait d'union manquant et
            "sur" au lieu de "sûr" — corrigées en "Êtes-vous sûr ?" à la demande explicite du
            mainteneur).
            `activerecord.attributes.payment_method.{label,is_special,is_credit_note,show_payment_method_to_user}`
            et `payment_status.{label,color}` ajoutés, référencés via `t()` explicite dans
            `f.label` (comme branches 05/06-evaluation). Les blocs d'erreur scaffold anglais des
            deux `_form.html.erb` (`"N error prohibited this ... from being saved:"`) laissés tels
            quels (anglais scaffold, pas de la copie française à extraire).
      - [x] `frontend/components/FailedPaymentImportsPage.jsx` → `withTranslation("payments")`,
            nouveau namespace i18next `payments` (`frontend/locales/{fr,en}/payments.json`, câblé
            dans `frontend/i18n/index.js`). Les `res.message` renvoyés par le contrôleur restent
            en dur côté backend (autre passe : i18n des réponses JSON contrôleur, hors périmètre) —
            donc en `en` les swal de `promptSubmit` affichent un titre traduit mais un corps encore
            français. Le format de date de la colonne « Date d'import », extrait en clé
            `payments:failedImports.importDateFormat`, a été corrigé de `hh:mm` (12 h sans AM/PM,
            ambigu — bug préexistant) vers `HH:mm` en passant.
      - [x] **Aucune vue supprimée dans cette branche.** `due_payment/update.html.erb` et
            `payment_statuses/show.html.erb` (stubs scaffold, apparemment jamais rendus) sont
            *soupçonnés* morts mais **laissés en place** — une branche i18n ne fait que de
            l'extraction de chaînes. Consignés pour analyse/suppression ultérieure dans
            `docs/KnownIssues.md` (section « Scaffold views suspected dead ») : un 500
            (`ActionNotFound`) ne prouve pas qu'une route est inutilisée (routes de plugins
            préfixées, `rescue_from`, `method_missing`, appels externes…).
      - [x] **`payment_schedule/show.html.erb` laissé en français** — c'est un document
            comptable / « échéancier » (rendu aussi en PDF via `render pdf:`), même catégorie que
            l'exception documentée `payments/bill.html.erb`. À traiter comme exception délibérée,
            pas comme oubli.
      - [x] **Tests** : `spec/requests/payment_admin_pages_spec.rb` (payment_method /
            payment_statuses index+new+edit, edit d'un moyen `built_in` pour couvrir la clé
            `built_in_notice`, payments#index, failed_payment_imports#index, fr+en, garde
            anti-`"translation missing"`) ; `frontend/components/FailedPaymentImportsPage.test.jsx`.
      - [x] **Vérification** : `bin/i18n-tasks health` → 0 manquant / 0 inutilisé (407 clés).
            `bundle exec rspec` → 105 exemples, 0 échec. `yarn test` → 9 fichiers / 24 tests.
    - [x] **Prep — clés `react-table` partagées** : branche `feature/i18n-common-react-table-keys`
          (indépendante, à faire avant les gros lots de tableaux de bord). Les 7 props de
          traduction de `react-table` (`previousText`…`rowsText`) sont dupliquées en dur dans ~10
          composants et vivaient en plus dans `users.json` sous `list.table.*`. Promues dans
          `frontend/locales/{fr,en}/common.json` → `common.reactTable.*` ; `UserList.jsx` migré
          (`t("common:reactTable.previousText")`), les 7 clés retirées de `users.json`. Doc :
          `docs/I18n.md` § « Convention de nommage des clés (frontend) ». Les futures branches de
          domaine réutilisent ces clés au lieu d'en redéclarer.
    - [~] **Lot 2 — tableaux de bord React** : bien plus gros que l'estimation initiale
          (~330 chaînes, 20 fichiers dont plusieurs > 1000 lignes) → découpé en plusieurs
          branches :
      - [x] **Lot 2a — `generalPayments/*` coque + feuilles** : branche
        `feature/i18n-06-payments-general-shell`. `GeneralPayments.jsx` (onglets),
        `BulkEditModal.jsx`, `MessageModal.jsx` (composants fonction → `useTranslation`),
        `SubPaymentList.jsx`, `PaymentScheduleList.jsx` (classe exportée sous le nom trompeur
        `DuePaymentList`), `CheckList.jsx` (classes → `withTranslation`). Clés sous
        `payments.general.*` ; props `react-table` via `common:reactTable.*` (branche prep) ;
        boutons via `common:actions.{save,cancel}` ; nouvelle clé partagée `common.confirm.sure`
        (frontend). `SubPaymentList` : `columns` déplacées du constructeur vers `render()` pour
        suivre le changement de langue. `DuePaymentList.jsx` / `PaymentList.jsx` **pas touchés**
        (lot 2b) — `GeneralPayments` les monte toujours, ils restent en français par défaut, ce
        qui est sans effet tant qu'on ne bascule pas en `en`. Tests :
        `GeneralPayments.test.jsx`, `PaymentModals.test.jsx`, `SubPaymentList.test.jsx`,
        `PaymentTables.test.jsx` (12 tests). `yarn test` → 13 fichiers / 36 tests.
      - [x] **Lot 2b — `generalPayments/{DuePaymentList,PaymentList}`** — branche
        `feature/i18n-06-payments-general-tables` (PR #12, mergée). ~1100 lignes chacun ;
        `withTranslation("payments")`. A aussi restructuré les clés de la 2a dans des sous-arbres
        partagés (`general.reminder.*`, `general.tableControls.*`, `general.{numberFilter,
        csvExport,statusEdit,paymentMail,seasonFilter,unknownPayer,noPaymentMethodOption,
        selectRemaining,bulkDeleteTitle,statusEditFailed}`) et migré `PaymentScheduleList` /
        `CheckList` dessus ; ajout `common.actions.{delete,validate}` (frontend). Revue
        `/code-review` : suppression du `promptStatusEdit` dupliqué mort dans `PaymentList.jsx`,
        latence « colonnes figées au constructeur » consignée dans `docs/KnownIssues.md`.
      - **`userPayments/*` legacy** (~4800 lignes, découpé) :
        - [x] **Lot 2c-i** — branche `feature/i18n-06-payments-user-legacy` :
          `SwitchPayerModal.jsx` (fonction → `useTranslation`), `PaymentsSummary.jsx`,
          `PaymentsList.jsx` (classes → `withTranslation`). Clés sous `payments.userPayments.*`
          (`switchPayer`/`summary`/`paymentsList`) ; `react-table` via `common:reactTable.*` (au
          passage la coquille « Précedent » de ces fichiers est corrigée en « Précédent » via la
          clé partagée) ; ajout `common.actions.confirm`. Tests : `SwitchPayerModal.test.jsx`,
          `PaymentsSummary.test.jsx`, `PaymentsList.test.jsx`.
        - [x] **Lot 2c-ii** — branche `feature/i18n-06-payments-due-payments-list` :
          `DuePaymentsList.jsx` (1358 l.) → `withTranslation("payments")`. Clés sous
          `payments.userPayments.duePaymentsList.*` ; réutilise largement `userPayments.paymentsList.*`
          (labels de modale partagés) + `common:*`. Test : `DuePaymentsList.test.jsx`.
        - [x] **Lot 2c-iii** — branche `feature/i18n-06-payments-management` :
          `PaymentsManagement.jsx` (2001 l., conteneur) → `withTranslation("payments")`. Clés sous
          `payments.userPayments.management.*` (formulaire imprimable, en-tête de page, swal/toast
          d'édition de statut + envoi de mail, avoirs/soldes de la saison précédente, bandeau
          « n'est plus payeur ») ; réutilise `general.statusEdit.title`,
          `general.statusEditFailed`, `general.reminder.errorTitle`,
          `general.paymentMail.errorTitle`, `common:*` ; ajout `common.actions.send`. Test :
          `PaymentsManagement.test.jsx`. **Lot 2c terminé** — le point de montage
          `payments/show.html.erb` est un pur `react_component`, rien à extraire côté ERB.
      - [x] **Lot 2d** — branche `feature/i18n-06-payments-terms` : composants « modalités de
        paiement ». `PayerPaymentTerms.jsx` + `PayerPaymentTermsInfo.jsx` +
        `paymentsTerms/PaymentScheduleOptionForm.jsx` + `userPayments/v2/{UserPaymentsV2,PaymentTermsSettingModal}.jsx`
        (tous des composants fonction → `useTranslation("payments")`). Clés sous `payments.terms.*`
        (`info`/`payer`/`optionForm`/`v2`) ; réutilise `general.reminder.{errorTitle,successTitle}` ;
        ajout `common.actions.add`. `WrappedPayerPaymentTerms.jsx` (chaînes = `MESSAGES.*` de
        `tools/constants`, partagées) et `utils/{DuePaymentStatuses.jsx,PaymentStatuses.js}`
        (constantes d'ID pures) : rien à extraire. Vues de montage
        (`user_payments/show_common.html.erb`, `payment_schedule_options/{new,edit}.html.erb`) :
        purs `react_component`. Tests : `PayerPaymentTerms.test.jsx`,
        `PaymentScheduleOptionForm.test.jsx`, `UserPaymentsV2.test.jsx`. **Lot 2 (payments) terminé.**
        Bug préexistant repéré (non corrigé, hors périmètre extraction) : `PayerPaymentTerms.jsx`
        utilise `_.uniq` dans `handleAddPayer` sans importer `lodash` → `ReferenceError` à l'ajout
        d'un payeur — à consigner / corriger séparément.
    - [ ] **`parameters/Payments/*` (12 composants) + `app/views/parameters/payments_parameters/index.html.erb`**
          rattachés au domaine `parameters`, pas `payments` — à faire dans la branche `parameters`.
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
- En continu : `bin/i18n-tasks health` (le binstub du dépôt, **pas** `bundle exec i18n-tasks` —
  ce dernier lance le binstub global du gem, sans le `require "logger"` ajouté en branche 04, et
  plante donc avec `uninitialized constant ActiveSupport::LoggerThreadSafeLevel::Logger` sous
  Ruby 3.3.5+) et le script d'extraction JS ne doivent rapporter aucune clé manquante pour les
  périmètres déjà balayés.
