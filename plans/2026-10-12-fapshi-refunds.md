# Remboursements marketplace réels via Fapshi

## Objectif

Remplacer la validation manuelle d'une référence de remboursement par un payout Fapshi traçable, asynchrone et idempotent, puis aligner l'espace Litiges du super-admin sur l'état réel du PSP.

## Réutilisation

- `MarketplaceDisputesWorkspace.vue` pour le dossier maître/détail et ses états existants.
- `useMarketplaceOperations.ts`, `api-query-keys.ts`, `ApiErrorCard`, `Badge`, `Button` et `Input`.
- Le registre financier et le journal d'audit backend existants.

## Contrat de données

- `POST /v1/marketplace/demandes-client/retours/:id/remboursement` initie un payout; téléphone facultatif si le paiement initial en fournit un.
- `POST /v1/marketplace/remboursements/fapshi/:retourId/rapprocher` relit le statut Fapshi.
- `POST /v1/marketplace/remboursements/fapshi/rappel` reçoit le webhook signé par secret partagé.
- `GET /v1/marketplace/remboursements/fapshi/certification` vérifie la configuration et le solde sans déplacer d'argent.
- Le détail retour expose `remboursementPsp` et la capacité `rapprocherRemboursement`.

## Phases

1. **Persistance et passerelle** — Ajouter la migration, les identifiants payout séparés, l'appel `/payout`, la lecture `/payment-status/:transId` et les gardes anti-double paiement. Fichiers : `../BackendKati/prisma`, `../BackendKati/src/marketplace/litiges`, `../BackendKati/src/config/configuration.ts`. Terminé quand le build et les tests ciblés passent.
2. **Comptabilisation sur confirmation** — Ne clôturer le retour et n'écrire le registre qu'après `SUCCESSFUL`; traiter échec, attente, rejeu et état réseau indéterminé. Terminé quand un test prouve l'absence d'écriture avant confirmation et l'idempotence après confirmation.
3. **Interface super-admin** — Remplacer la référence manuelle par téléphone facultatif, état PSP, erreur et rapprochement. Fichiers : `app/components/operations/MarketplaceDisputesWorkspace.vue`, `app/composables/useMarketplaceOperations.ts`, `app/types/api/marketplace-operations.ts`, traductions. Terminé quand typecheck, lint et tests UI ciblés passent.
4. **Certification** — Documenter la recette sandbox et les étapes externes d'activation live. Terminé quand l'endpoint de contrôle et le runbook distinguent clairement prêt techniquement et certifié en production.

## États

Le panel couvre préparé, soumis, confirmé, échec et vérification requise, avec chargement/erreur déjà gérés par les requêtes du workspace. Le bouton d'initiation disparaît pendant un payout actif; le rapprochement apparaît lorsqu'un `transId` existe.

## Tests et risques

- Tester les identifiants payout dédiés, la coupure réseau ambiguë, la configuration collecte/payout identique et la confirmation comptable.
- Risque principal : une réponse perdue après acceptation du payout. Réponse : état `verification_requise`, aucune relance automatique.
- La certification live dépend des secrets et de l'activation externe par Fapshi; elle reste explicitement non acquise tant que le test contrôlé n'a pas eu lieu.
