# Fichiers des justificatifs vendeur dans le panel

## Objectif

Lot 2 du plan maître `../plans/2026-10-15-corrections-et-completions.md`. Les marchands déposent maintenant leurs justificatifs sous forme de fichiers, chiffrés et analysés par l'antivirus. La direction doit pouvoir **ouvrir le fichier** pendant la vérification du dossier.

## Contrat backend

- `GET /v1/vendeurs/:id` : chaque document porte `nomFichier`, `typeMime`, `tailleOctets` et `statutAnalyse`. Ces champs sont nuls pour un document repris par clé de stockage.
- `GET /v1/vendeurs/:id/documents/:documentId/fichier` (direction) : le fichier en clair. Réponse 409 pour un document sans fichier, 403 pour un fichier bloqué par l'antivirus.

## Phases

1. **Types** : `app/types/api/marketplace-moderation.ts`.
2. **Écran** : `SellerOnboardingWorkspace.vue`.
   - Le nom du fichier et le verdict « analysé, aucune menace ».
   - Le bouton « Ouvrir le fichier », absent pour un document sans fichier ou infecté.
   - La mention d'un document repris par clé.
   - Les traductions fr et en.
3. **Tests** : `test/nuxt/seller-onboarding-documents.test.ts`.
