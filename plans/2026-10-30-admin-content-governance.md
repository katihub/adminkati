# Contenus et notifications

Réutiliser l’identité marine/orange, les composants, les contrats de bannières et la file de notifications existants. Pas de nouveau concept Image Gen : continuité du design déjà accepté, pas de nouvelle identité.

1. `app/pages/content.vue` et `content/BannerOverview` : résumé de toutes les bannières (actives, emplacements, déclinaisons mobiles), raccourci direction vers notifications, cadre responsive. États chargement/erreur distincts de zéro ; édition, publication et réorganisation existantes conservées. Terminé quand compteurs et sauvegardes des éditeurs restent corrects.
2. `operations/OutboundNotificationsWorkspace.vue`, composable existant et nouveau panneau de confirmation : ne lire/afficher les destinataires que pour direction ; confirmation avant traitement de la file, verrou synchrone contre double clic, erreurs relance visibles, dates et références lisibles, pagination et filtres synchronisés. Aucun envoi réel pendant recette.
3. Tests : nouvelles régressions Tester, tests bannières existants, rendu desktop/mobile et accès selon rôle. Contrats existants `/vitrine/administration/bannieres`, `/notifications[/synthese|/traiter|/:id/relancer]`.

Risques : effets réels du dispatch, données privées, limites API et états SSR ; préserver les gardes serveur. Aucun endpoint notification ni droits n’est élargi.
