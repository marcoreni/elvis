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
