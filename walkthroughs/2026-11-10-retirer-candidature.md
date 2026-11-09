# Compte rendu : retirer la candidature d'un marchand

Plan : `plans/2026-11-10-retirer-candidature.md`.

## Résultat

- **Sur la fiche du dossier** (Opérations → Dossiers vendeurs), sous les décisions, une zone **Retirer la candidature** :
  - elle est proposée pour un dossier en brouillon, soumis, en vérification, à corriger ou refusé ;
  - elle demande le motif, saisi dans le champ « Motif » de la décision (5 caractères au moins) ;
  - une confirmation est demandée : « Retirer cette candidature de la liste ? », puis « Oui, retirer ».
- **Ce que fait le retrait** :
  - la candidature quitte la liste des dossiers ; le filtre de statut **Retirée** la retrouve ;
  - la boutique est archivée et son nom (slug) est libéré ;
  - les membres de la boutique sont désactivés, ce qui libère l'adresse e-mail ;
  - la personne peut donc se réinscrire avec le même nom et la même adresse.
- **Qui** : la direction, et le point focal pour les boutiques qui lui sont assignées.
- **Refusé** :
  - un dossier approuvé (il se suspend, comme avant) ;
  - un dossier déjà retiré ;
  - une boutique qui a déjà des produits ou des commandes.
- **Rien n'est effacé** : le vendeur, la boutique, les pièces et le journal (`vendeur.candidature_retiree`, avec le motif et l'ancien nom) restent en base. Le compte de connexion de la personne n'est pas touché.

## Fichiers

- **BackendKati** :
  - la migration `20261110090000_retrait_candidature` (valeur `retiree`) ;
  - `VendeursService.retirerCandidature` et `POST /vendeurs/:id/retrait` ;
  - la liste des vendeurs, qui écarte les candidatures retirées par défaut.
- **adminkati** :
  - `SellerOnboardingWorkspace.vue` ;
  - `useMarketplaceModeration.ts` (`withdrawApplication`) ;
  - `utils/seller-documents.ts` (`canWithdrawSellerApplication`) ;
  - les traductions `operations.onboarding`.

## Tests

- **BackendKati** : `retrait-candidature.spec.ts` (5 tests : libération, point focal, statuts, produits et commandes, longueur du slug) ; la liste des vendeurs du point focal est mise à jour.
- **adminkati** : `seller-documents.test.ts` (la règle) et `seller-onboarding-documents.test.ts` (le retrait avec motif et confirmation).
