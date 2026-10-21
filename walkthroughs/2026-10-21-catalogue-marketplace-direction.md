# Walkthrough — Catalogue marketplace pour la direction

## Résultat

- Nouvel onglet **Opérations → Catalogue marketplace**, visible de la direction seulement (`/operations?tab=marketplace-offers`). Il liste toutes les offres de toutes les boutiques : photo, titre, référence, marque, catégorie, boutique et raison sociale du vendeur, statut, badge « vérifié », prix et prix barré, disponible, date de publication, lien vers la fiche de la vitrine.
- Filtres : recherche (produit, marque, référence, boutique), boutique (avec son nombre d'offres), statut, catégorie (racine ou sous-catégorie), niveau de stock. Tris : plus récentes, par boutique, par nom, prix et stock croissants ou décroissants. Compteurs cliquables par statut, 50 offres par page, bouton « Effacer les filtres ».
- Le stock est coloré : rouge en rupture, orange à 5 ou moins, « Non suivi » pour une boutique qui ne suit pas son stock.
- Backend : `GET /v1/marketplace/administration/offres` (`catalogue-administration.controller.ts`, `.service.ts`, `.dto.ts`), réservé à la direction.

## Vérifications

- Backend : `catalogue-administration.service.spec.ts` — 6 tests réussis (accès refusé hors direction, pagination et disponible, combinaison des filtres, niveaux de stock, tris, validation). `tsc --noEmit` et ESLint — réussis.
- Backend, essai réel sur la base locale (3 406 offres) : total identique au comptage SQL ; filtre NowTech 3 394 ; catégorie racine Sécurité & Surveillance 612 (sous-catégories incluses) ; recherche « hikvision » 223 ; tri par boutique et page 2 cohérents. Avec deux stocks mis temporairement à 0 et 3 : « rupture » 1, « faible » 1, « disponible » 3 405, tri stock croissant avec ces deux offres en tête ; stocks remis à 25 ensuite. Accès vendeur 403, sans jeton 401, `taille=500` 400.
- Admin : `marketplace-offers-workspace.test.ts` — 2 tests réussis ; `operations-page.test.ts` — 59 tests réussis avec le nouvel onglet. oxlint et oxfmt — réussis sur les fichiers modifiés.
- Admin, navigateur réel (panel local connecté en direction) : onglet actif, « 3406 offers », « Page 1 of 69 », filtre rupture → 1 offre, tri par boutique page 2, aucune erreur JavaScript ; captures à 1440 px et 390 px.
- Admin : `nuxt typecheck` signale toujours les 4 erreurs préexistantes de `DeliveryFeesWorkspace.vue` et de `delivery-fees-workspace.test.ts`, sans lien avec ce lot ; aucune erreur dans les fichiers ajoutés.

## Limites

- Lecture seule : suspendre ou modifier une offre se fait toujours depuis la modération.
- Le seuil « stock faible » (5) est fixe côté serveur.
- La base locale n'avait pas les 9 dernières migrations ; elles ont été appliquées en local (sauvegarde préalable) pour que le garde d'authentification fonctionne. La production les a déjà.
