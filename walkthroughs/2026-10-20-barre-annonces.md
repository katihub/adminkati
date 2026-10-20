## What I built

La barre supérieure de la vitrine lit désormais ses messages depuis le backend et les fait défiler en boucle. Un onglet « Annonces » dans Contenu permet à la direction d’ajouter, modifier, activer/désactiver et réordonner les messages ; le rôle comptoir peut les consulter en lecture seule.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Stockage rejouable, droits et textes initiaux | Done | `BackendKati/sql/vitrine.sql:32` |
| Contrats et opérations API publiques/admin | Done | `BackendKati/src/vitrine/vitrine.controller.ts:159`, `BackendKati/src/vitrine/vitrine.service.ts:236` |
| Éditeur du tableau de bord | Done | `adminkati/app/pages/content.vue:34`, `adminkati/app/components/content/AnnouncementsWorkspace.vue:1` |
| Lecteur serveur et repli | Done | `websitekati/src/lib/announcements.ts:1`, `websitekati/src/components/marketplace/KatiHeader.tsx:15` |
| Ticker responsive et accessible | Done | `websitekati/src/components/marketplace/KatiAnnouncementTicker.tsx:1`, `websitekati/src/components/marketplace/kati-announcement-ticker.module.css:1` |
| Invalidation du cache annonces | Done | `websitekati/src/lib/catalogue-en-direct.ts:56`, `websitekati/src/app/api/revalider/route.ts:110` |

## Deviations

- L’identité des trois textes initiaux repose sur une colonne `code` distincte du texte éditable. Ainsi, rejouer le SQL après qu’un administrateur a renommé un texte ne recrée pas l’ancien libellé.
- La lecture admin est aussi autorisée au rôle `comptoir`, conformément à l’accès en lecture de l’espace Contenu existant ; toutes les écritures restent réservées à `direction`.
- Le ticker expose un bouton pause/reprise en plus de la pause au survol/focus, et respecte `prefers-reduced-motion`.

## Tests

- `npm.cmd run build` dans `BackendKati` : `nest build` terminé avec code 0.
- `npm.cmd test -- --runInBand --runTestsByPath src/vitrine/annonces.service.spec.ts src/vitrine/vitrine.dto.spec.ts src/vitrine/vitrine.controller.spec.ts` : 3 suites passées, 56 tests passés.
- `npm.cmd test -- --runInBand --runTestsByPath sql/vitrine.spec.ts --testNamePattern="annonces de la barre"` : 3 tests annonces passés (8 tests non liés ignorés par le filtre).
- `bun.cmd run typecheck` dans `adminkati` : terminé avec code 0.
- `bun.cmd x vitest run --project nuxt --coverage.enabled=false test/nuxt/announcements-workspace.test.ts` : 1 fichier, 3 tests passés (lecture comptoir, ajout, modification/activation/réordre). Les téléchargements de polices externes sont bloqués par l’environnement mais n’empêchent pas les tests.
- `bun.cmd run i18n:check` : terminé avec code 0.
- `bun.cmd x oxlint` sur les fichiers admin modifiés : terminé avec code 0.
- `npm.cmd run typecheck -- --pretty false` et `npm.cmd run build` dans `websitekati` : terminés avec code 0.
- ESLint ciblé sur les fichiers storefront modifiés : terminé avec code 0.
- `npm.cmd exec playwright test -- e2e/announcements.spec.ts --workers=1 --reporter=line` : les quatre cas annoncés (bureau/mobile, pause/reprise, réduction des animations) ont affiché leur étape réussie ; le processus Playwright ne s’est pas terminé après le dernier cas et a dû être interrompu pendant l’arrêt du serveur local. Le résultat global du runner n’est donc pas revendiqué comme un code de sortie réussi.
- Le run backend non filtré des tests ciblés a révélé une assertion SQL préexistante hors annonces : elle attend l’ensemble d’emplacements de bannières `principal/promo`, alors que le script autorise aussi `pub_accueil`.
- `bun.cmd run format:check` global dans `adminkati` échoue sur 714 fichiers préexistants du dépôt ; les fichiers admin de cette modification ont été formatés séparément.

## Not done

Le script SQL n’a pas été exécuté contre une base de données dans cet environnement. La mise en ligne nécessite le déploiement du backend puis du panel et de la vitrine. Le runner Playwright a besoin d’un nettoyage de processus Windows pour fournir une fin de commande propre, malgré les quatre cas terminés sans échec visible.

## Notes for the reviewer

À vérifier en base de recette : rejeu du script, état de la séquence `vitrine.annonces_id_seq`, et revalidation Next après une modification réelle depuis le panel. L’ancien test SQL des placements de bannière est indépendant de cette fonctionnalité et n’a pas été changé.
