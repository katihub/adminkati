## What I built

Vue d'ensemble des bannières et cadre responsive des contenus, sans remplacer les éditeurs existants. Notifications accessibles à la direction uniquement, avec confirmation explicite de l'effet réel, verrou synchrone contre double soumission et détails de traçabilité.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Résumé bannières par publication/emplacement/mobile | Done | `app/components/content/BannerOverview/BannerOverview.vue` |
| Contenus responsive et raccourci notifications | Done | `app/pages/content.vue` |
| Destinataires protégés, confirmation, verrous et erreurs | Done | `app/components/operations/OutboundNotificationsWorkspace.vue`, `app/components/operations/NotificationDispatchDialog/NotificationDispatchDialog.vue` |
| Sauvegarde et publication bannières | Done, tests locaux | `test/nuxt/banner-edit-save.test.ts`, `test/nuxt/banner-publish-toggle.test.ts` |
| API réelle bannières | Partial | HTTP 500 reproduit ; remise en service serveur nécessaire |

## Deviations

Les journaux fournis par l'exploitant confirment des tables `vitrine` absentes en production. Correction d'initialisation isolée dans le plan `../../plans/2026-10-30-initialisation-schemas-administration.md` à la racine du workspace, pas un faux succès affiché dans les composants. Aucun envoi réel déclenché, aucune publication réelle modifiée.

## Tests

Commande groupée réellement exécutée : `bunx vitest run test/nuxt/admin-governance.test.ts test/nuxt/outbound-notifications.test.ts test/nuxt/team-workspace.test.ts test/unit/admin-navigation.test.ts test/nuxt/content-page.test.ts test/nuxt/banner-edit-save.test.ts test/nuxt/banner-publish-toggle.test.ts test/nuxt/banner-role-gating.test.ts test/nuxt/team-hire-dialog.test.ts test/nuxt/team-api.test.ts --coverage.enabled=false` : **10 fichiers, 62 tests réussis**.

Le Tester avait reproduit le double POST avant ajout du verrou ; les régressions vérifient maintenant un seul POST, annulation sans POST et absence de lecture/affichage pour non-direction. Les tests SystemEvidence ajoutés ultérieurement passaient déjà : aucune phase rouge artificielle revendiquée pour eux.

Format contrôlé sur les 22 fichiers concernés : réussi. Lint et i18n : réussis, avec un avertissement lint préexistant sur `categorie-schema.test.ts`. Compilation Nuxt réussie, avertissements de dépendances/outillage conservés.

Recette Playwright temporaire hors dépôt, car **Browser plugin not available** : interface locale `http://127.0.0.1:4290` reliée à `https://api.katimarket.com`. Connexion réelle direction 200 ; contenu, équipe, paramètres et notifications visités à 1440×1000 et 390×844. URL/titres corrects, contenu non vide, aucun overlay ni débordement horizontal. Confirmation ouverte puis annulée et disparition vérifiée ; **aucune écriture `/api/v1/` observée**. Les erreurs console restantes sont les réponses HTTP 404/500 réelles décrites ci-dessous, pas une certification console globale sans erreur.

## Not done

Les bannières réelles restent indisponibles (500) tant que la base serveur n'a pas été initialisée par l'exploitant. La recette réelle de sauvegarde/publication ne peut pas être annoncée réussie ; elle est couverte localement. Les filtres de file synchronisent la requête et réinitialisent la page, mais ne sont pas persistés dans l'URL. Aucun compte agent réel autre que direction n'a été fourni ; droits vérifiés par tests, pas par connexion agent production.

## Notes for the reviewer

Captures hors dépôt : `C:/Users/Rufus/AppData/Local/Temp/katihub-content-live-390.png` et `katihub-notifications-live-1440.png`. Le tiret des compteurs en panne est intentionnel : il ne signifie pas zéro bannière. Les styles marine/orange existants ont été conservés. Aucun fichier `mobilekati` touché, aucun commit ni déploiement.
