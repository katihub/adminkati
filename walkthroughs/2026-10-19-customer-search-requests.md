# Requêtes saisies dans la recherche client — walkthrough

## Ce qui a été livré

- Les recherches réellement validées depuis les deux barres de recherche de la vitrine sont enregistrées de façon non bloquante.
- Le backend conserve le libellé saisi, sa version normalisée, le rayon éventuel et la date, sans identité client, adresse IP ni empreinte navigateur.
- La direction dispose sur l’accueil du dashboard d’une zone « Recherches clients » avec période 7/30/90 jours, total, termes uniques, volume du jour, recherches populaires et formulations récentes.
- La zone gère ses propres états de chargement, d’erreur et d’absence de données sans bloquer le reste du dashboard.
- Les autres rôles ne déclenchent pas la requête et ne voient pas la zone.

## Couverture du plan

| Phase | État | Vérification |
| --- | --- | --- |
| Persistance et API | Terminée | Migration Prisma, POST public limité, GET protégé `direction`, normalisation et agrégations testées |
| Capture côté vitrine | Terminée | Soumission principale et sélection/soumission de recherche raccordées à un proxy Next.js résilient |
| Zone super-admin | Terminée | Composant responsive, filtre temporel, états dédiés et garde par rôle |

## Écarts au plan

- Le composant d’affichage a été découpé en trois fichiers pour respecter le seuil de complexité du projet.
- Le titre mobile a été raccourci en « Recherches clients » afin de préserver sa lisibilité à côté du sélecteur de période.
- La recherche par image n’est volontairement pas journalisée ici : cette vue concerne uniquement les termes tapés et validés.

## Vérifications exécutées

- Backend : 2 suites, 5 tests passés ; `npm.cmd run build` réussi.
- Vitrine : typecheck, lint et build Next.js réussis.
- Dashboard : 1 fichier, 5 tests passés ; lint réussi avec deux avertissements préexistants hors périmètre ; vérification i18n, typecheck, audit Fallow et build Nuxt réussis.
- Contrôle visuel Playwright : desktop 1440 × 1000 et mobile 390 × 844, sans débordement horizontal ni erreur de page.
- `git diff --check` réussi dans les trois projets.

## À faire lors du déploiement

- Appliquer la migration `20261018150000_requetes_recherche_clients` sur la base cible avant de mettre en ligne le frontend qui envoie les événements.
- Définir ultérieurement une durée de conservation si le volume de recherches le justifie ; aucune suppression automatique n’a été introduite.

## Notes de revue

- La capture est déclenchée uniquement lors d’une soumission ou du choix d’une suggestion, jamais à chaque frappe.
- Une indisponibilité de l’endpoint analytique est ignorée côté vitrine afin que la recherche du client continue normalement.
- Les avertissements de fournisseurs de polices observés pendant les tests locaux sont dus à l’accès réseau restreint ; ils n’ont pas empêché les tests ni le build.
