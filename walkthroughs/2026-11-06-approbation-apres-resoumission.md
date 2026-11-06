# Compte rendu : approuver un dossier vendeur après une nouvelle soumission

Plan : `plans/2026-11-06-approbation-apres-resoumission.md`.

## Résultat

- Lorsqu'un vendeur soumet à nouveau un document refusé (ou renouvelle un document expiré) et que l'équipe valide le nouveau, le bouton « Approuver et activer » redevient cliquable. Le backend accepte aussi l'approbation.
- L'approbation reste bloquée dans les cas suivants :
  - le nouveau document n'est pas encore validé ;
  - le document le plus récent d'un type est celui qui a été refusé ;
  - une photo de la boutique n'est pas validée ;
  - le dossier est vide.
- L'ancien document refusé reste visible dans la liste, avec son motif.

## Fichiers

- BackendKati :
  - `src/vendeurs/pieces-requises.ts` : `dossierApprouvable` ;
  - `src/vendeurs/vendeurs.service.ts` : `deciderDossier` lit aussi le type et la date des documents.
- Panel :
  - `app/utils/seller-documents.ts` : `isSellerFileApprovable`, la même règle ;
  - `app/components/operations/SellerOnboardingWorkspace.vue`.

## Vérifications

- BackendKati : `npx jest src/vendeurs` donne 77 tests sur 77. `tsc --noEmit` est propre.
- Panel :
  - `test/unit/seller-documents.test.ts` (6 cas) et `seller-onboarding-documents.test.ts` passent ;
  - `typecheck`, `oxlint` et `fallow audit` sont propres.
