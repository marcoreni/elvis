# Notes pour l'agent /code-review dans ce dépôt

Ce dépôt a deux remotes (`origin` = upstream ELVIS-SOFTWARE/elvis, `fork` = le fork personnel où
les PRs de ce chantier sont ouvertes) et un historique de branches empilées. Deux erreurs concrètes
ont déjà été rencontrées en review — les corriger a demandé du temps ; suivre la checklist
ci-dessous pour ne pas les reproduire.

## Erreurs déjà rencontrées

1. **Le skill a réétudié le mauvais diff.** En lançant `/code-review high 1` (ou `2`) alors que la
   session avait un autre branch checked-out localement (ou aucun remote `gh` par défaut), l'agent
   a review le diff cumulatif de la session / de la branche actuellement checked-out au lieu du
   diff réel de la PR demandée. Résultat : des findings sur des fichiers qui n'appartiennent même
   pas à la PR en question.
2. **`gh pr view <N>` échoue silencieusement sans remote par défaut.** Avec deux remotes, `gh`
   n'a pas de dépôt par défaut tant qu'on n'a pas lancé `gh repo set-default <owner>/<repo>` (fait
   une fois pour ce dépôt → `marcoreni/elvis`, persiste dans la config locale de `gh`). Sans ça,
   `gh pr view <N>` sans `--repo` plante ou résout vers le mauvais dépôt.

## Checklist à suivre à chaque revue de PR

1. **Vérifier le dépôt par défaut** : `gh repo set-default --view` (si absent :
   `gh repo set-default marcoreni/elvis`).
2. **Récupérer la vérité terrain avant toute chose** :
   `gh pr view <N> --json baseRefName,headRefName,files,mergeable,mergeStateStatus`
3. **Checkout la branche exacte de la PR** (`headRefName` ci-dessus) — `git checkout <branche>` —
   AVANT de lancer `/code-review`. Ne jamais lancer la revue en étant sur une autre branche.
4. **Lancer la revue** : `/code-review <effort> <N>`.
5. **Vérifier chaque finding** : comparer le champ `file` de chaque finding retourné à la liste de
   fichiers récupérée à l'étape 2. Si un seul finding pointe vers un fichier hors de cette liste,
   **jeter tout le résultat** et recommencer à partir de l'étape 3 (probablement mauvaise branche
   checked-out).
6. **Vérifier les affirmations techniques surprenantes ou à fort impact** avant de les rapporter —
   ne pas faire confiance aveuglément à un claim de comportement runtime. Exemples de vérifications
   déjà faites avec succès dans ce dépôt :
   - Reproduire un crash i18n directement : `bundle exec rails runner '...'`
   - Vérifier l'ordre réel des callbacks Rails :
     `ApplicationController._process_action_callbacks.each { |cb| puts "#{cb.kind}: #{cb.filter}" }`
   - Vérifier une route/contrôleur cité (`grep`/lecture directe du fichier) plutôt que de prendre
     l'affirmation du finding pour argent comptant — un des findings avait une affirmation
     partiellement fausse sur `root_path` nécessitant `authenticate_user!`, corrigée avant d'être
     rapportée.
7. Ne rapporter (via `ReportFindings`) que les findings confirmés ou plausibles après cette
   vérification, avec la sévérité correcte et, si besoin, une correction du libellé/mécanisme
   erroné plutôt qu'un simple copier-coller du finding brut.

## Additional notes

(Written in English — new content in this repo's docs is authored in English going forward, see
`CLAUDE.md`. The sections above predate that decision and are left as originally written.)

### Verify a proposed fix, not just the finding

When implementing (or reviewing) a suggested fix, confirm it actually changes runtime behavior
instead of trusting its description. Example from PR #2's findings doc
(`docs/I18n-PR2-Review-Findings.md`, finding #5): a fix proposal for `LocaleController#update`'s
guest-redirect bug was to set `fallback_location: request.referer.presence || root_path`. That
reads as reasonable, but it's a no-op — `redirect_back` already tries `request.referer` internally
before ever falling back to `fallback_location`, so the fallback branch only runs when `referer` is
already blank, meaning `request.referer.presence` inside it is always `nil`. The actual fix had to
drop the dependency on `Referer` entirely (an explicit `return_to` param instead). Trace the real
method being changed before accepting a fix description at face value — the same discipline finding
claims already get in step 6 above should apply to proposed fixes too.

### Test suite environment gaps (found while fixing PR #2's findings)

- `bundle exec rspec` used to fail immediately with `ActiveRecord::AdapterNotSpecified` because
  `config/database.yml` had no `test:` block — fixed on `feature/i18n-01-foundation-backend`. If specs
  won't even load with that error, check for a missing `test:` block before assuming the app or spec
  code itself is broken.
- `bundle exec rubocop` isn't runnable in a plain `bundle install` of this repo — `rubocop` isn't
  currently a Gemfile dependency, despite the `bundle exec rubocop` command documented in `CLAUDE.md`.
  Confirm with `grep rubocop Gemfile Gemfile.lock` before assuming lint tooling is just missing
  locally.
- `spec/services/activities_application_controller_spec.rb` fails to even load
  (`NameError: uninitialized constant ActivityApplications::TesImporter`) independent of any specific
  branch — it's a pre-existing break, not a regression from the change under review. Exclude it
  (`--exclude-pattern`) rather than treating it as a signal about the current diff.
- `Rails.cache` is a real `ActiveSupport::Cache::FileStore` in the test env (`config/environments/test.rb`
  sets no `cache_store`, so it falls through to this default) — found while fixing PR #5's findings.
  Unlike the DB, `DatabaseCleaner`'s transaction rollback does **not** clear it: a spec that creates a
  `Parameter` (or anything else that populates `Rails.cache`) and doesn't explicitly delete the cache key
  afterward leaks that value into every later spec — in the same run, and across separate `bundle exec
  rspec` invocations, since it's written to disk (`tmp/cache/test`). Symptom looks like unrelated tests
  failing/flaking only when run together or re-run, not in isolation. If a spec touches `Parameter` (or
  any `Rails.cache.fetch`-backed value), clear its specific cache key(s) before (and ideally after) the
  example — see `spec/models/parameter_spec.rb` and the `around` block in
  `spec/controllers/application_controller_spec.rb` for the pattern.
