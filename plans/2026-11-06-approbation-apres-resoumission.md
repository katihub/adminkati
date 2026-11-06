# Plan : approuver un dossier vendeur après une nouvelle soumission

## Besoin

Quand l'équipe refuse un document, le vendeur en soumet un nouveau. Une fois ce nouveau document validé, le bouton « Approuver » reste grisé.

## Cause

Une nouvelle soumission crée un nouveau document. L'ancien reste au dossier avec le statut « refusé ». Or l'approbation exigeait que **tous** les documents soient validés, à deux endroits :

- `SellerOnboardingWorkspace.vue` (`allDocumentsValid`) ;
- `deciderDossier` dans BackendKati.

## Règle retenue (piste 1, choisie le 6 novembre)

Un document refusé ou expiré ne bloque plus l'approbation dès qu'un document plus récent du même type existe. Tous les autres documents doivent toujours être validés, y compris chaque photo de la boutique.

## Étapes

1. **Backend** : `dossierApprouvable` dans `pieces-requises.ts`, utilisé par `deciderDossier`.
2. **Panel** : `isSellerFileApprovable` dans `app/utils/seller-documents.ts`, utilisé par l'espace d'inscription des vendeurs.
3. **Tests** : écrits avant le code, des deux côtés.

## Effets ailleurs

Aucun autre écran n'est concerné. L'ancien document refusé reste affiché dans la liste, pour l'historique.
