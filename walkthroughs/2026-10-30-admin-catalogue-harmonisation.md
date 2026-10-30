## What I built

Le module **Produits** référence maintenant les fiches communes du catalogue marketplace ; **Offres vendeurs** référence les conditions commerciales propres à chaque boutique. La fiche produit donne accès aux offres liées et les offres renvoient vers le produit, le vendeur et la modération. L'ancien catalogue est conservé sous `/legacy-products` (`/fr/catalogue-historique`) et les anciens identifiants numériques sont redirigés vers lui.

Les corrections administratives exigent le rôle direction, un motif et la version de la fiche. Elles sont journalisées avec avant/après dans la même transaction que l'écriture ; elles ne modifient ni les commandes, ni les réservations, ni les statuts de publication. Les révisions vendeur ouvertes restent à traiter en modération.

## Plan coverage

Plan gelé : `plans/2026-10-30-admin-catalogue-harmonisation.md`.

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Liste, détail et correction des fiches communes | Done | `../BackendKati/src/marketplace/produits-administration.service.ts`, `produits-administration.controller.ts`, `produits-administration.dto.ts` |
| Filtre produit exact, fiche et correction des offres | Done | `../BackendKati/src/marketplace/catalogue-administration.service.ts`, `corrections-offres-administration.service.ts` |
| Catalogue marketplace principal et maintien de l'historique | Done | `app/pages/products.vue`, `app/pages/legacy-products.vue`, `app/components/catalogue/` |
| Navigation cohérente, liens croisés, cache et brouillons | Done | `app/components/operations/MarketplaceOffersWorkspace.vue`, `MarketplaceCatalogueModerationWorkspace.vue`, `app/utils/admin-navigation.ts`, `app/composables/useCatalogueDraftGuard.ts` |
| Tests, compilation et recette visuelle locale | Partial | Résultats ci-dessous ; recette sur base réelle non effectuée, base locale inaccessible et nouveaux endpoints non déployés |

## Deviations

- Pas de copie/fusion des anciennes données vers la marketplace : ce serait une migration distincte, risquée pour les références des commandes. L'harmonisation est fonctionnelle et visuelle, pas une certification de migration.
- Le composant `Field` cité dans le plan n'est pas installé ; réutilisation du wrapper label/contrôle `PointsOfSaleField`, des contrôles shadcn installés, de `PillTabs` et du dialogue d'abandon existant. Aucun fichier de kit généré modifié.
- Les prix de modération réutilisent maintenant `formatMontant`, au lieu d'une définition locale du format monétaire ; même affichage exact en FCFA et moins de duplication.
- Une expression régulière existante de `../BackendKati/src/assistant/montants.ts` contenait deux espaces Unicode littéraux refusés par ESLint. Remplacement par `\u00a0` / `\u202f`, sans changer le comportement.
- API navigateur isolée temporaire, hors dépôt, faute de base locale disponible. Aucune écriture sur `api.katimarket.com`. Le plugin Browser étant absent, utilisation de Playwright/Chromium en repli pour la recette.

## Tests

Résultats effectivement observés, pas une recette production :

- Backend : `npm.cmd test -- --runInBand src/marketplace/produits-administration.service.spec.ts src/marketplace/corrections-offres-administration.service.spec.ts src/marketplace/produits-administration.dto.spec.ts src/marketplace/catalogue-administration.service.spec.ts` : **4 suites, 54 tests réussis**, 14,811 s lors du dernier run observé. Couvre direction/comptoir/non-équipe, validation des entrées, pagination/recherche, produits sans offre, filtre exact produit commun aux résultats et au total, catégories à trois niveaux, garantie minimale, révision ouverte, version obsolète, P2034→409, autres erreurs conservées, journal atomique, absence d'écriture de stock/statut/commande. Tests délégués au Tester avant implémentation, régressions rouges puis vertes.
- Backend : `npm.cmd run lint` et `npm.cmd run build` : **code de sortie 0**.
- Frontend : `bunx vitest run test/nuxt/marketplace-products.test.ts test/nuxt/marketplace-offer-form.test.ts test/nuxt/marketplace-offers-workspace.test.ts test/nuxt/marketplace-content-moderation.test.ts test/nuxt/marketplace-moderation-api.test.ts test/nuxt/catalogue-quality-workspaces.test.ts test/nuxt/products-workspace.test.ts test/nuxt/products-add-button-role.test.ts test/nuxt/products-mock-page.test.ts test/nuxt/stock-import-page.test.ts test/unit/admin-navigation.test.ts test/unit/route-query.test.ts --coverage.enabled=false` : **12 fichiers, 60 tests réussis**, 49,98 s. Les quatre tests historiques ont uniquement changé d'import pour cibler `legacy-products.vue`, sans suppression d'assertions. Les tests des offres utilisent une vraie session de test direction et attendent les mises à jour asynchrones ; UUID valides et assertions URL complètes pour changements rapides, pagination, réinitialisation et lien enregistré.
- `bun run typecheck`, `bun run lint`, `bun run i18n:check` : **code de sortie 0**. Un avertissement lint préexistant dans `test/unit/categorie-schema.test.ts:34` (`no-conditional-expect`).
- `bun run fallow` : **code de sortie 0**, `dead code 0 · complexity 0 · duplication 0`, aucun problème bloquant sur 45 fichiers changés après ajout du test d'abandon et de ce compte rendu. Avis CSS sur les dimensions déjà présentes dans les écrans de modération et historique, conservées pour ne pas redessiner ces zones.
- `bunx oxfmt --check` sur les fichiers de cette tâche : **All matched files use the correct format**, 36 fichiers au moment du contrôle. `git diff --check` dans les deux dépôts : **code de sortie 0**.
- `bunx vitest run test/nuxt/catalogue-draft-discard.test.ts --coverage.enabled=false` : **1 fichier, 1 test réussi**, 16,38 s. Avec la campagne principale, **61 tests frontend** vérifiés. Utilise le vrai dialogue et vérifie annulation, confirmation exécutée une fois et absence de callback résiduel.
- `npm.cmd test -- --runInBand src/assistant/montants.spec.ts` : **23 tests réussis**, 5,238 s, pour le remplacement purement syntaxique des espaces Unicode de la regex.
- `bun run build` final : **code de sortie 0**, `Build complete!`, sortie Node-server 41 Mo, après arrêt de l'aperçu qui verrouillait la DLL Sharp. Avertissements de dépendances esbuild/oxc, DEP0155 et `nuxt-zod-schemas` non résolu conservés ; ils n'empêchent pas cette compilation ni les parcours testés.
- Dernière recette Playwright sur cette compilation : **6 parcours réussis**, aucune exception navigateur. Liste→détail→sauvegarde produit ; lien vers offres filtrées ; sauvegarde de prix sans modification du stock ; mobile sans débordement global ; annulation conservant le brouillon puis abandon confirmé ; création suivie d'une redirection vers la fiche (le paramètre `new` disparaît). Trois mutations uniquement dans l'API de contrat en mémoire, aucune base réelle utilisée.

Captures finales inspectées visuellement à 1440×1000 et 390×844 et comparées au shell marine/orange accepté : navigation, tokens, hiérarchie et cartes conservés. Le champ recherche mobile occupe sa propre ligne. Les onglets restent accessibles en défilement horizontal sur petit écran.

Une vérification navigateur supplémentaire a trouvé un vrai défaut d'abandon : Reka émet la fermeture du dialogue avant de transmettre le clic de confirmation. Le callback était supprimé trop tôt. `useCatalogueDraftGuard.cancel` laisse passer cet événement synchrone puis nettoie le callback annulé en microtask ; test de régression avec le vrai dialogue et rerun navigateur verts après correction. La première tentative du test automatisé pendant une compilation a échoué sur l'alias Nuxt `#app-manifest`, pas sur une assertion métier ; le test a été relancé après la compilation.

Preuves locales (données de contrat QA, pas données réelles) :

- `C:/Users/Rufus/.codex/visualizations/2026/10/21/01a15d78-7a7e-74e0-9eaf-865f053c3ed7/catalogue-desktop.png`
- `C:/Users/Rufus/.codex/visualizations/2026/10/21/01a15d78-7a7e-74e0-9eaf-865f053c3ed7/offres-desktop.png`
- `C:/Users/Rufus/.codex/visualizations/2026/10/21/01a15d78-7a7e-74e0-9eaf-865f053c3ed7/catalogue-mobile.png`

## Not done

Pas de déploiement, migration, commit, changement `mobilekati`, envoi de notification, commande ou paiement réel. Les nouveaux GET/PATCH `/v1/marketplace/administration/produits` et `/offres/:id` exigent la version backend correspondante ; ne pas déployer seulement l'admin. Aucune erreur API n'est transformée artificiellement en liste vide.

Les flux d'upload/modération d'images/PDF, de stock et de publication existants restent la référence ; pas de contournement de leurs contrôles. La fiche de correction d'offre édite prix/prix de référence/MOQ/garantie/délai, pas toutes les métadonnées du marchand.

Les serveurs de contrat et d'aperçu QA ont été arrêtés après validation. L'admin de développement a été relancé sur `http://127.0.0.1:4290/`, avec sa configuration API `https://api.katimarket.com` rétablie. Cette API distante ne reçoit pas automatiquement les nouveaux fichiers : pour tester les nouvelles lectures/corrections sur des données réelles, il faut démarrer la nouvelle version du backend sur une base de recette et pointer l'admin dessus, ou déployer le backend correspondant.

## Notes for the reviewer

Les transactions sont courtes, optimistes et `Serializable`, sans appel réseau interne, conformément aux règles Postgres. Les P2034 deviennent un conflit explicite à recharger plutôt qu'une réécriture automatique. Vérifier le parcours connecté avec une vraie base de recette avant déploiement ; la recette de contrat ne démontre pas une persistance PostgreSQL, les migrations serveur, ni les permissions de tous les comptes existants en production.

Le premier build frontend a réussi. Un rebuild effectué pendant qu'un aperçu utilisait Sharp a ensuite échoué avec un verrou Windows `EPERM ...libvips-42.dll` ; arrêt de cet aperçu avant de relancer. Aucun fichier source ni donnée supprimé pour contourner ce verrou.
