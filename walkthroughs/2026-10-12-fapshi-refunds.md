## What I built

Les remboursements marketplace sont désormais des payouts Fapshi réels, persistés séparément du retour et finalisés uniquement après confirmation `SUCCESSFUL`. Le panel super-admin montre l'état PSP, permet un numéro vérifié facultatif et offre un rapprochement de secours sans demander de référence inventée.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Persistance et passerelle payout distincte | Done | `../BackendKati/prisma/migrations/20261012110000_remboursements_psp_fapshi`, `../BackendKati/src/marketplace/litiges/fapshi-remboursements.service.ts` |
| Comptabilisation après confirmation | Done | `../BackendKati/src/marketplace/litiges/litiges.service.ts` |
| Webhook, rapprochement et contrôle de configuration | Done | `../BackendKati/src/marketplace/litiges/fapshi-remboursements.controller.ts` |
| Interface super-admin alignée | Done | `app/components/operations/MarketplaceDisputesWorkspace.vue`, `app/composables/useMarketplaceOperations.ts` |
| Procédure de certification live | Partial — code et runbook prêts, activation externe non disponible | `../BackendKati/deploiement/CERTIFICATION_FAPSHI.md` |

## Deviations

Le remboursement ne réutilise pas `FapshiService`, car celui-ci dépend du service de collecte et le module paiement importe déjà le module marketplace. Un client payout dédié dans le domaine litiges évite une dépendance circulaire et impose les identifiants séparés exigés par Fapshi.

## Tests

- `npm.cmd test -- --runInBand src/marketplace/litiges/fapshi-remboursements.service.spec.ts src/marketplace/litiges/litiges-cycle.spec.ts src/marketplace/litiges/litiges-lecture.spec.ts` : 3 suites, 14 tests réussis.
- `npm.cmd run build` dans `BackendKati` : réussi.
- `npx.cmd prisma validate` : schéma valide.
- `npm.cmd run bd:recette:preparer` : migration appliquée; 48 migrations, schéma de `katihub_recette` à jour.
- `pnpm.cmd typecheck` dans `adminkati` : réussi.
- `pnpm.cmd lint` : réussi avec deux avertissements préexistants hors périmètre.
- `pnpm.cmd i18n:check` : réussi.
- Vérification de format ciblée sur les fichiers modifiés : réussie. La vérification globale signale de nombreux fichiers historiques non formatés.
- Le démarrage Vitest Nuxt reste bloqué avant collecte par le `DataCloneError` déjà observé dans la configuration Nuxt; aucun test de composant n'a donc été déclaré passant.

## Not done

La certification de production Fapshi n'est pas déclarée acquise : il manque les identifiants live du service payout, son activation par le support Fapshi et un payout contrôlé réel. Le runbook décrit exactement les preuves à réunir.

## Notes for the reviewer

Vérifier en priorité la politique de gestion de `verification_requise` : une coupure réseau après POST interdit volontairement toute relance automatique afin d'éviter un double remboursement. Le test sandbox complet doit être effectué dès que les identifiants payout sont fournis.
