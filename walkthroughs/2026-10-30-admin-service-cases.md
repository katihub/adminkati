## What I built

Fiche SAV consolidée dans le workspace existant : commande, client, vendeur, retour et règlement, preuves, échanges horodatés et historique. Navigation locale, pagination de la file, erreurs de mutations visibles et formulaires réinitialisés au changement de dossier.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Contexte et règlement | Done | `app/components/operations/ReturnSettlement/ReturnSettlement.vue`, `MarketplaceDisputesWorkspace.vue` |
| Preuves, échanges, export et historique | Done | Workspace existant réutilisé, téléchargement privé et contrôle antivirus conservés |
| Actions selon capacités/statut | Done | `BackendKati/src/marketplace/litiges/litiges.service.ts`, capacité `repondre`, validation des frais |
| Pagination et mobile | Done | File paginée, retour liste sur mobile, sections accessibles par ancres |

## Deviations

Le vendeur légal est ajouté à la lecture du retour. La lecture SSR attend ses queries initiales pour empêcher l’hydratation d’une grille vide alors que le cache contient déjà des données. Aucune mutation financière ni aucun endpoint de paiement n’est remplacé.

## Tests

- Backend : 8 suites ciblées, 50 tests passants, incluant lectures/cycle litiges et droits point focal, vendeurs, activité client et synthèse finance.
- Frontend : dernier run combiné de 10 fichiers, 121 tests passants. Nouveau test : un dossier résolu reste lisible mais interdit la réponse.
- `bun run typecheck`, `bun run lint`, `bun run i18n:check` et `bun run fallow` réussis. Lint conserve un avertissement préexistant de test ; audit conserve des avis de style et duplications héritées non bloquantes.
- Playwright, Browser plugin not available : `http://127.0.0.1:4280`, API temporaire contractuelle sur 3299, données de recette hors sources. Vérification des fiches, ancre échanges, pas de page vide/overlay, dernier passage sans erreur console ; 1600×1000 et 390×844, aucun débordement horizontal de page. Captures dans le dossier temporaire Windows `katihub-domain-sav-desktop.png` et `katihub-domain-sav-mobile.png`.

## Not done

Pas de déploiement, de commit, d’écriture en production, de remboursement PSP réel ni de validation S3 réelle. Ces opérations exigent une recette intégrée séparée avec les services configurés.

## Notes for the reviewer

Le backend et l’admin doivent être livrés ensemble. Le catalogue et les autres changements déjà présents dans le worktree ont été préservés. Les nouvelles preuves utilisent toujours les protections serveur existantes.
