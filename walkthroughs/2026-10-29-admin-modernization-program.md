# Walkthrough — Programme de modernisation du panneau d’administration

## Statut

Mise à jour du 29 octobre : le programme reste **partiel**, mais les tranches tableau de bord et présentation du workspace Produits sont maintenant implémentées. La navigation contextuelle des Opérations est suivie séparément dans `walkthroughs/2026-10-29-admin-operations-navigation.md`. Les paragraphes ci-dessous décrivent la première tranche ; les résultats nouveaux figurent dans l'addendum en fin de fichier.

**Partial** — première tranche de la phase 3 livrée : coque, navigation métier, recherche locale des modules et navigation mobile. Les écrans métier et le contenu du tableau de bord restent à moderniser par lots.

## Ce qui a été livré

- Remplacement de l’ancienne navigation horizontale par une sidebar bleu nuit persistante sur bureau.
- Regroupement des destinations existantes par domaines métier : Commerce, Catalogue, Réseau commercial, Clients, Livraison et SAV, Finance, Communication et Administration.
- Sous-destinations réelles vers les workspaces existants, y compris les onglets historiques de la page Opérations.
- Filtrage des entrées et sous-entrées selon les rôles déjà portés par la session.
- État actif synchronisé avec la route et ses paramètres de requête.
- Recherche de modules dans la barre supérieure, tolérante aux accents et limitée aux destinations autorisées.
- Drawer mobile avec cibles tactiles, fermeture explicite et fermeture automatique après navigation.
- Accès direct à la marketplace quand l’URL est configurée.
- Nouvelles traductions françaises et anglaises pour la navigation et la recherche.

## Fichiers principaux

- `app/components/admin/AdminShell.vue`
- `app/components/admin/AdminHeader.vue`
- `app/components/admin/AdminNavigation.vue`
- `app/components/admin/AdminMobileNavigation.vue`
- `app/components/admin/AdminModuleSearch.vue`
- `app/components/admin/navigation/Group.vue`
- `app/utils/admin-navigation.ts`
- `app/assets/css/main.css`
- `i18n/locales/common/fr.json`
- `i18n/locales/common/en.json`

## Vérifications

### Automatisées

- `bunx vitest run test/unit/admin-navigation.test.ts test/nuxt/admin-navigation.test.ts test/nuxt/admin-shell.test.ts test/nuxt/admin-module-search.test.ts test/nuxt/admin-profile-menu.test.ts` — **34 tests réussis**.
- `bun run build` — **réussi**.
- `bun run lint` — **réussi**, avec un avertissement hérité dans `test/unit/categorie-schema.test.ts`.
- `bun run i18n:check` — **réussi**.
- `bun run format:check ...` sur les fichiers modifiés — **réussi**.
- `git diff --check` — **réussi**.

### Contrôle visuel navigateur

Le plugin Browser n’étant pas disponible, le contrôle a été effectué avec Chromium/Playwright en local aux formats 1600 × 1000 et 390 × 844.

- La sidebar reste fixe et son contenu défile indépendamment sur bureau.
- La sélection orange et le contraste de la navigation restent lisibles.
- La recherche de modules occupe la zone centrale de la topbar sur bureau.
- Sur mobile, la sidebar disparaît au profit d’un bouton menu de 44 px.
- Le drawer mobile s’ouvre au-dessus du contenu, conserve toutes les destinations autorisées et reste défilable.
- La page ne présente pas de débordement horizontal aux deux largeurs vérifiées.

### Comparaison avec le concept

1. **Structure** — conforme : sidebar sombre, topbar claire et contenu principal séparé.
2. **Palette** — conforme : bleu nuit structurel et orange KatiMarket réservé à l’action active.
3. **Navigation** — conforme : domaines et sous-destinations sont hiérarchisés au lieu d’une suite d’onglets plats.
4. **Responsive** — conforme : drawer mobile dédié avec fermeture visible.
5. **Densité** — conforme pour la coque ; les écrans métier gardent encore leur densité actuelle.
6. **Contenu central** — volontairement partiel : les cartes, graphiques, files de travail et actions rapides du concept seront traités dans une tranche dédiée avec des données réelles.

### Copie et libellés

- « Opérations » n’est plus présenté comme un fourre-tout : ses destinations sont réparties dans les domaines métier.
- « Livraison et SAV », « Réseau commercial » et « Communication » décrivent plus directement la responsabilité de l’agent.
- Les résultats de recherche utilisent exactement les mêmes libellés que la navigation.

## Limites connues hors de cette tranche

- Le serveur API local configuré sur `localhost:3101` n’était pas disponible pendant le contrôle navigateur ; les cartes existantes du tableau de bord ont donc affiché leur état d’erreur récupérable. Une seule erreur réseau 502 a été observée, sans erreur JavaScript du nouveau shell.
- `bun run typecheck` reste bloqué par des erreurs préexistantes dans `DeliveryFeesWorkspace.vue` et son test, sans erreur remontée dans les fichiers de cette tranche.
- `bun run fallow` reste bloqué par des duplications/complexités préexistantes dans plusieurs workspaces Opérations et `MobileMoneyRequest.vue`. La nouvelle navigation ne figure plus dans ces alertes après sa décomposition.
- La recherche actuelle couvre les modules et sous-modules. La recherche globale de commandes, produits, vendeurs et clients sera ajoutée lorsque les contrats API correspondants auront été confirmés.

## Prochaine tranche recommandée

Moderniser le module **Produits** comme tranche verticale de référence : liste claire, URL de détail stable, bouton Modifier explicite selon les droits, fiche structurée par domaines et historique visible. Cette tranche permettra ensuite de reproduire le même patron dans Commandes, Vendeurs, Clients, Finance et SAV.

## Addendum — Tableau de bord et workspace Produits

### What I built

Le tableau de bord présente sept indicateurs marketplace alimentés par le contrat existant, avec des liens vers les opérations correspondantes. La salutation reprend le nom de session, les filtres de période restent utilisables sur téléphone, les indicateurs deviennent un rail tactile et les files prioritaires se compactent sur petit écran.

Le workspace Produits possède un cadre lisible, une liste latérale sur bureau et une fiche avec identité et indication des droits d'édition. Les boutons import/export/création passent sur plusieurs lignes sur téléphone pour éliminer le débordement horizontal. L'édition existante reste directe ; un mode distinct avec bouton Modifier n'est pas encore livré.

### Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Coque et navigation métier | Done pour la coque ; routes distinctes et recherche globale restantes | `app/components/admin/`, `app/utils/admin-navigation.ts` |
| Indicateurs et files de décision réels | Done pour les données disponibles | `app/components/stats/MarketplaceCommandCenter.vue`, `MarketplaceKpiGrid.vue` |
| Découvrabilité fiche et droits produits | Partial : édition directe expliquée, pas de mode Modifier séparé | `app/components/products/DetailHeader.vue` |
| Responsive produits | Done sur les largeurs examinées | `app/pages/products.vue` |
| Ajouts MOQ/variantes/tags/upsell administratifs | Not done : audit des contrats encore requis | — |
| Commerce, SAV, vendeurs, clients et finance | Not done pour la refonte détaillée | — |

### Deviations

- Les composants produits et mutations existants sont conservés. Aucune nouvelle API ni donnée de démonstration n'est intégrée à l'application.
- Le bouton Modifier du programme reste à concevoir : cette tranche clarifie le formulaire directement éditable et son enregistrement après changement.
- La correction du typage des frais de livraison utilise un événement natif `change`, afin de laisser intact le composant généré `ui/native-select`.

### Tests

- `bun run typecheck` : sans erreur TypeScript lors du contrôle observé.
- Tests ciblés dashboard, produits et livraison : **82 tests réussis** lors du contrôle avant la dernière reprise.
- Après resserrement mobile, `marketplace-command-center.test.ts` et `stats-blocks.test.ts` : **10 tests réussis**.
- Build de production : réussi avant la dernière reprise ; les dernières vérifications sont consignées dans le walkthrough de navigation des opérations.
- Lint : passe, un avertissement hérité `vitest(no-conditional-expect)` dans `categorie-schema.test.ts`.
- Traductions : vérifiées avec `i18n:check`.
- Fallow : contrôle repris, gate réussi (`No issues in 56 changed files`), avec alertes héritées et recommandations de style.

### Vérification visuelle et limites

Browser plugin absent : Chromium/Playwright utilisé avec une API temporaire de test. Le contrôle visuel ne prouve pas la persistance en production. Les données de test ne sont pas ajoutées au dépôt.

Comparaisons avec les concepts desktop/mobile existants : sidebar bleu nuit et sélection orange ; topbar claire ; hiérarchie titre/valeurs/métadonnées ; panneaux blancs à bordures fines ; navigation mobile en drawer. Écarts intentionnels : marque réelle KatiMarket, recherche limitée aux modules, métriques limitées aux contrats disponibles, files de décision existantes au lieu de métriques fictives du mockup.

Débordement Produits corrigé : largeur de document **390 px** pour un viewport **390 px**. Les indicateurs mobiles passent en rail tactile ; la page dashboard testée passe de 8489 à 5742 px de hauteur. Des requêtes annexes non simulées (notamment délais de livraison) restent en erreur dans la fixture navigateur ; elles ne permettent pas de conclure à une erreur de l'API réelle.

### Not done

La modernisation de tous les domaines, la validation de sauvegarde sur base réelle, les permissions fines, les fiches consolidées vendeur/client et la recherche fédérée restent ouvertes. Aucun déploiement ou commit n'est réalisé dans cette tranche.
