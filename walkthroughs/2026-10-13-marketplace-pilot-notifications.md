## What I built

La direction dispose de deux nouveaux onglets dans **Opérations** :

- **Pilote marketplace** : création d'un pilote (ville, boutiques cochées, seuils de sortie saisis en pourcentage puis convertis en points de base), transitions démarrer / suspendre / terminer, chacune confirmée dans une boîte de dialogue, mesures calculées par le serveur face à leurs seuils, et évaluation figée avec une clé d'idempotence nouvelle à chaque clic.
- **Notifications** : synthèse de la file persistante (compteurs par statut, ancienneté de la plus vieille attente), filtre par statut, liste paginée avec dernière erreur, relance d'une notification abandonnée et traitement immédiat. Quand aucun fournisseur de courriel n'est configuré, l'écran le dit au lieu d'afficher un succès vide.

Côté backend, le même lot a ajouté le calcul des mesures, le cycle de vie des pilotes, la table `notifications_sortantes`, son traitement planifié et les notifications des litiges, retours, remboursements et retraits (voir `../plans/2026-10-13-exploitation-pilote-marketplace.md`).

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Types, clés et composables | Done | `app/types/api/marketplace-pilot.ts`, `app/types/api/notifications.ts`, `app/utils/api-query-keys.ts`, `app/composables/useMarketplacePilots.ts`, `app/composables/useOutboundNotifications.ts` |
| Écran pilote | Done | `app/components/operations/MarketplacePilotWorkspace.vue`, `MarketplacePilotCreateForm.vue`, `app/utils/pilot-measures.ts` |
| Écran notifications | Done | `app/components/operations/OutboundNotificationsWorkspace.vue` |
| Onglets, traductions et tests | Done | `app/pages/operations.vue`, `i18n/locales/operations/{fr,en}.json`, `test/unit/pilot-measures.test.ts`, `test/nuxt/marketplace-pilot.test.ts`, `test/nuxt/outbound-notifications.test.ts`, `test/nuxt/operations-page.test.ts` |
| Route backend `GET /pilotes/references` | Added | Il n'existait aucune API listant les villes ; elle renvoie villes et boutiques actives |

## Important design decisions

- **La confirmation garde l'action à part de l'état d'ouverture.** Le bouton d'action d'`AlertDialog` ferme la boîte avant d'exécuter son gestionnaire. Lier l'action au fait que la boîte soit ouverte la remettait à `null` avant l'appel, et rien ne partait. Un test le couvre.
- **Toutes les transitions sont confirmées**, y compris le démarrage : il fixe la date à partir de laquelle les commandes comptent.
- **Les taux restent entiers.** Le formulaire accepte `90` ou `2,5`, convertit en points de base et refuse ce qui sort de 0–100 ; l'affichage seul divise.
- **Un indicateur hors seuil est signalé, pas masqué** : bordure ambre, avec la valeur et le seuil côte à côte.

## Deviations from the plan

- `SellerFinanceWorkspace.vue` : la comparaison `=== "echec"` du gabarit a été déplacée dans une fonction du script. `i18n:check` la prenait pour un texte d'interface et bloquait le hook de pré-commit. Le comportement est identique.
- `test/nuxt/legal-closure-api.test.ts` : ajout de l'import `readBody` depuis `h3`. Le test échouait déjà avant ce lot (`readBody is not defined`).

## Verification performed

- `bun run i18n:check` : réussi.
- `bunx oxlint` et `bunx oxfmt --check` sur les 18 fichiers modifiés : aucun problème.
- `bun run typecheck` : réussi.
- `bun run fallow` : « No issues in 61 changed files », avec seulement des avertissements de style dans des fichiers antérieurs.
- Tests ciblés avec `--testTimeout=60000` : `pilot-measures` (3), `marketplace-pilot` (4), `outbound-notifications` (3), `legal-closure-api` (2) et `operations-page` (18) réussis. Avec le délai par défaut de 5 s, les premiers tests de `operations-page` dépassent le délai à cause de la compilation Nuxt à froid sur ce poste.
- Suite complète : 1 955 réussis, 13 en échec, 60 ignorés. Aucun échec dans les fichiers de ce lot. Ils concernent les textes IA, le formulaire produit et des démontages d'environnement Nuxt (`EnvironmentTeardownError`, délais de hook), dans des fichiers que ce lot n'a pas modifiés.
- Backend, sur la base PostgreSQL `katihub_recette` : `pnpm recette:marketplace` réussi. Le parcours rejoue commande, livraison, caisse, litige, retour, remboursement Fapshi, contestation, arbitrage et retrait. Les 12 notifications attendues sont écrites puis envoyées par la file, et le pilote est mesuré et évalué « prolonger » sans bloquant.

- Navigateur réel (Playwright, Chromium) contre le panel de développement et le backend local `nowtech` (migration appliquée), avec connexion en direction : les deux onglets s'affichent à 1 440 px et à 390 px, sans erreur console ni API, et sans défilement horizontal sur mobile. Ce contrôle a conduit à afficher les compteurs de notifications sur deux colonnes à 390 px.

## Not verified

- Rendu navigateur de l'état rempli (pilote en cours avec mesures, notifications abandonnées) : couvert par les tests Nuxt et le parcours de recette backend, mais pas capturé en navigateur. Je n'ai pas voulu créer de pilote dans la base de développement, car un pilote ne se supprime pas.
- Envoi réel par Resend ou Brevo : le traitement a été vérifié avec un fournisseur simulé uniquement.
