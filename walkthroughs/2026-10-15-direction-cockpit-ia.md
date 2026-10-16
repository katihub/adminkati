# Walkthrough — Cockpit Direction et navigation métier KatiHub

## Résultat livré

Ce premier incrément transforme la page d’accueil en poste de pilotage Direction sans modifier le contrat backend.
Il relie les volumes déjà disponibles à des files de travail actionnables, remplace la navigation technique par neuf
domaines métier et applique la palette KatiHub marine/orange sans vert.

## Modèle métier et sources de vérité

- `docs/direction-cockpit-operating-model.md` documente les utilisateurs internes, leurs responsabilités, leurs
  décisions quotidiennes, les files, les responsables et les cibles de service proposées.
- `app/utils/admin-destinations.ts` centralise les neuf destinations métier et le rattachement des onglets Opérations.
- `app/utils/direction-cockpit.ts` transforme uniquement `MarketplaceCommandCenter` en files visibles. Les files à
  zéro sont masquées, `pending_approvals` n’est pas compté une seconde fois et aucune ancienneté fictive n’est créée.
- Les cibles visibles sont explicitement des « SLA cibles » de politique interne, pas des délais mesurés.

## Navigation et retour immédiat

- `app/utils/admin-navigation.ts` expose Pilotage, Commerce, Catalogue, Vendeurs, Clients, Logistique, Finance,
  Marketing et Administration, avec visibilité conservée selon les rôles techniques existants.
- Les domaines qui partagent `/operations` sont activés selon `route.query.tab` afin qu’un seul domaine soit marqué
  actif.
- `AdminNavigation.vue` utilise le préchargement sur interaction plutôt que le préchargement simultané à l’apparition.
  Le lien cliqué devient immédiatement `aria-busy` et affiche un spinner jusqu’à la fin ou l’échec de navigation.
- `app/app.vue` monte un indicateur Nuxt alimenté par `brand.colors.orange`.

## Cockpit Direction

`MarketplaceCommandCenter.vue` assemble cinq surfaces :

1. travaux prioritaires avec volume, priorité, responsable, SLA cible et action ;
2. santé de la marketplace avec les six KPI contractuels ;
3. flux commande de la soumission à la livraison ;
4. alertes agrégées sans timestamp ni référence simulés ;
5. actions rapides issues des mêmes définitions de files.

Le titre de la page est devenu « Pilotage » et le sous-titre explique la finalité quotidienne. Les analyses historiques
restent sous le cockpit, et le comportement générique sans bloc `marketplace` reste inchangé.

## Écart assumé avec le plan

Le découpage paresseux des vingt workspaces Opérations est **partiel et non livré dans ce lot**. Une première
implémentation avec les auto-imports `LazyOperations…` compilait, mais elle contournait les stubs de la matrice Nuxt et
faisait échouer les 56 tests de deep links. Elle a été retirée plutôt que de masquer une régression. Le préchargement
sur interaction, le spinner local et l’indicateur global sont livrés immédiatement.

Le build confirme que le chantier reste nécessaire : `.output/server/chunks/build/operations-*.mjs` pèse environ
664 kB (92,6 kB gzip). Le prochain incrément doit scinder la route en sous-routes ou introduire une frontière
asynchrone explicitement injectable et testable, puis mesurer le waterfall avant/après.

## Validation observée

- Tests unitaires ciblés : 30/30 passent (navigation, files Direction, configuration et palette de marque).
- Tests Nuxt cockpit/navigation/shell : 17/17 passent.
- Tests Nuxt Opérations : 56/56 passent après restauration de la frontière synchrone stable.
- `bun run typecheck` : passe.
- `bun run i18n:check` : passe.
- `bun run lint` : passe avec deux avertissements préexistants (`app/types/session.ts` et
  `test/unit/categorie-schema.test.ts`).
- `bun run build` : passe. Avertissements existants : grands chunks client, `eval` dans `lottie-web`, exports
  dépréciés de dépendances et schéma virtuel `nuxt-zod` externalisé.
- Contrôle visuel headless en 1536 × 1400 : hiérarchie conforme au concept, aucune couleur verte sur les nouvelles
  surfaces, pas de débordement desktop. La page temporaire et la capture de QA ont été supprimées après inspection.

Le disque système C: était saturé pendant une relance, causant des erreurs `ENOSPC` sans rapport avec le code. Les
contrôles ont ensuite été exécutés avec un répertoire temporaire local au workspace sur D:.

La revue indépendante initiale a détecté puis fait corriger cinq points avant livraison : type trop large du flux,
fixtures `admin-shell` obsolètes, spinner sur clic modifié, destinations opérationnelles dupliquées et carte d’actions
rapides vide. Les portes ci-dessus correspondent à l’état après correction.

## Points restant à traiter

- Découper réellement la page Opérations et les gros bundles communs, puis vérifier le waterfall sur une session
  authentifiée.
- Valider les SLA proposés avec les responsables métier avant de calculer des retards réels.
- Ajouter au backend les timestamps et états détaillés nécessaires aux âges de file, au respect des SLA et aux
  anomalies nominatives.
- Faire une passe visuelle authentifiée mobile et sombre lorsque la session navigateur de QA est disponible.
