# Review — Cockpit Direction et navigation métier KatiHub

## Verdict

**Verdict final après corrections : mergeable pour le périmètre revu.** Les cinq findings initiaux sont résolus dans le code et couverts par les contrôles ciblés. Le découpage lazy d’Opérations reste un chantier ultérieur déjà déclaré, pas un défaut caché de cet incrément.

- Findings non résolus : MAJOR: 0 · MEDIUM: 0 · MINOR: 0
- Findings résolus : MAJOR: 2 · MEDIUM: 2 · MINOR: 1
- INT restant : 1
- Revue des corrections : 15/15 tests unitaires et 17/17 tests Nuxt passent ; `bun run typecheck` passe
- Tests ciblés : `bunx.cmd vitest run test/unit/direction-cockpit.test.ts test/unit/admin-navigation.test.ts test/nuxt/admin-navigation.test.ts test/nuxt/marketplace-command-center.test.ts test/nuxt/operations-page.test.ts` → 83/83 passent
- Portes déjà observées : `bun run i18n:check` → succès ; `bun run lint` → succès avec 2 avertissements préexistants

## Statut des corrections

| Finding initial | Statut | Preuve vérifiée |
| :-- | :-- | :-- |
| Suite `admin-shell` non migrée | **RÉSOLU** | `test/nuxt/admin-shell.test.ts` utilise `pilotage`, le nouveau titre, `routeNames` et `query`; les 4 tests passent. |
| Type trop large du flux opérationnel | **RÉSOLU** | `DirectionOperationalFlow.vue:6` dérive `OperationalStage` du tuple étroit ; `bun run typecheck` sort avec le code 0. |
| Pending bloqué après clic modifié | **RÉSOLU** | `AdminNavigation.vue:18` ignore les clics annulés, non principaux et avec modificateur ; le test Ctrl-clic passe. |
| Destinations opérationnelles dupliquées | **RÉSOLU** | `admin-destinations.ts:15` expose `operationalDestinations`, consommé par le modèle de files et les alertes. |
| Carte Actions rapides vide | **RÉSOLU** | `DirectionQuickActions.vue:18` ne rend pas la section sans file ; le scénario calme le vérifie. |

## Plan fidelity

| Élément du plan | Verdict | Preuve |
| :-- | :-- | :-- |
| Modèle métier, files et SLA cibles | DONE | `docs/direction-cockpit-operating-model.md:1`, `app/utils/direction-cockpit.ts:21` |
| Registre unique des destinations | DONE | `app/utils/admin-destinations.ts:1` centralise les entrées principales et opérationnelles, réutilisées par les files et alertes. |
| Navigation en neuf domaines et permissions existantes | DONE | `app/utils/admin-navigation.ts:13`, `test/unit/admin-navigation.test.ts:23` |
| Domaine actif selon l’onglet Opérations | DONE | `app/utils/admin-navigation.ts:96`, `test/nuxt/admin-navigation.test.ts:132` |
| Cockpit alimenté uniquement par `marketplace` | DONE | `app/components/stats/MarketplaceCommandCenter.vue:11`, `test/nuxt/marketplace-command-center.test.ts:32` |
| Feedback immédiat de navigation | DONE | `app/app.vue:31`, `app/components/admin/AdminNavigation.vue:18`; le clic modifié est ignoré et couvert par `test/nuxt/admin-navigation.test.ts`. |
| Découpage paresseux des workspaces Opérations | PARTIAL | Non livré ; déviation explicitement documentée dans `walkthroughs/2026-10-15-direction-cockpit-ia.md:41`. |
| Vérifications automatiques | DONE pour le périmètre corrigé | 32/32 tests concernés passent et `bun run typecheck` sort avec le code 0. |
| Vérification visuelle desktop/mobile/sombre | PARTIAL | Desktop déclaré vérifié ; mobile authentifié et mode sombre restent explicitement à traiter dans `walkthroughs/2026-10-15-direction-cockpit-ia.md:72`. |

**Walkthrough accuracy:** l’écart lazy reste correctement déclaré. Après corrections, la phrase « `bun run typecheck` : passe » est désormais reproductible et les tests de navigation précédemment obsolètes passent.

## Findings

### MAJOR

**1. [RÉSOLU] La migration de navigation laissait la suite `admin-shell` en échec**

- Where: `test/nuxt/admin-shell.test.ts:27`, `test/nuxt/admin-shell.test.ts:57`, `test/nuxt/admin-shell.test.ts:72`
- Axis: Tests / Logic and correctness
- Problem: le test continue à chercher l’ancien identifiant `overview`, l’ancien titre « Overview » et construit des items avec `routeName` alors que le contrat utilise désormais `pilotage`, « Operations overview/Pilotage » et `routeNames`.
- Failure: l’exécution isolée produit 3 échecs sur 4 ; le dernier cas appelle `item.routeNames.includes(...)` avec `routeNames === undefined` et lève un `TypeError`.
- Resolution: assertions et fixtures migrées vers le nouveau contrat ; 4/4 tests `admin-shell` passent.

**2. [RÉSOLU] Le nouveau flux opérationnel faisait échouer le typecheck**

- Where: `app/components/stats/DirectionOperationalFlow/DirectionOperationalFlow.vue:6`, `app/components/stats/DirectionOperationalFlow/DirectionOperationalFlow.vue:24`, `walkthroughs/2026-10-15-direction-cockpit-ia.md:57`
- Axis: Logic and correctness / Tests
- Problem: `ids` est typé `MarketplaceOrderStatus[]`, qui autorise aussi `cancelled` et `attention`, tandis que `stageLabels` ne définit que quatre clés. L’indexation `stageLabels[stage.id]` est donc illégale pour TypeScript.
- Failure: `bun run typecheck` échoue avec TS7053, en plus des deux fixtures `routeName` obsolètes ; la porte CI annoncée comme verte est rouge.
- Resolution: tuple `as const` et type `OperationalStage` dérivé ; le typecheck complet passe.

### MEDIUM

**1. [RÉSOLU] Le spinner de navigation pouvait rester bloqué après un clic avec modificateur**

- Where: `app/components/admin/AdminNavigation.vue:18`, `app/components/admin/AdminNavigation.vue:49`, `app/components/admin/AdminNavigation.vue:84`
- Axis: UI/UX / Logic and correctness
- Problem: `startNavigation` passe immédiatement l’item en pending pour tout événement `click`, sans vérifier `Ctrl`, `Meta`, `Shift`, bouton non principal ou `defaultPrevented`. Dans ces cas, Vue Router n’effectue pas de navigation dans l’onglet courant, donc ni `afterEach` ni `page:finish` ne nettoient l’état.
- Failure: Ctrl/Cmd-clic sur un domaine ouvre un nouvel onglet mais laisse `aria-busy` et le spinner visibles indéfiniment dans l’onglet courant.
- Resolution: les clics annulés, non principaux et modifiés sont ignorés ; un test de régression Ctrl-clic passe.

**2. [RÉSOLU] La source de vérité des destinations n’était pas réellement unique**

- Where: `app/utils/admin-destinations.ts:1`, `app/utils/direction-cockpit.ts:21`, `app/components/stats/DirectionAlerts/DirectionAlerts.vue:7`
- Axis: Code quality / Logic and correctness
- Problem: le registre centralise seulement les neuf entrées principales ; les mêmes URLs et onglets sont réécrits dans le modèle de files et dans les alertes.
- Failure: un renommage futur de `seller-onboarding` ou `marketplace-disputes` peut corriger la navigation tout en laissant les actions du cockpit pointer vers un onglet obsolète, malgré la promesse de « source de vérité ».
- Resolution: `operationalDestinations` centralise les liens nommés et les consommateurs les importent ; les tests d’URL exacte restent verts.

### MINOR

**1. [RÉSOLU] L’état calme laissait une carte « Actions rapides » vide**

- Where: `app/components/stats/DirectionQuickActions/DirectionQuickActions.vue:18`
- Axis: UI/UX
- Problem: lorsque toutes les files valent zéro, la section est toujours rendue mais la grille ne contient ni action ni message.
- Failure: le scénario déjà testé « aucun travail prioritaire » affiche ensuite un titre « Actions rapides » au-dessus d’un espace vide, ce qui ressemble à un chargement incomplet.
- Resolution: la section est masquée lorsque `queues.length === 0` et le test de l’état calme l’affirme.

### INT

**1. Le chantier de performance Opérations reste volontairement ouvert**

- Where: `app/pages/operations.vue:190`, `walkthroughs/2026-10-15-direction-cockpit-ia.md:41`
- Axis: Performance
- Observation: les vingt workspaces restent synchrones. La déviation est clairement déclarée et les 56 tests de deep links passent ; elle doit rester un incrément séparé avec mesure du bundle/waterfall, plutôt qu’être présentée comme résolue par le seul préchargement sur interaction.

## Clean axes

- Security: aucun nouvel endpoint, secret, rendu HTML non sûr ou élargissement d’autorisation détecté.
- Data correctness: les volumes du cockpit proviennent des champs contractuels prévus ; l’agrégat `pending_approvals` n’est pas doublé et les SLA sont bien présentés comme des cibles.
- Accessibility, hors état pending signalé: liens nommés, focus visibles, `aria-current`, `aria-busy` et cibles tactiles sont présents.
- i18n et palette des nouvelles surfaces: contrôles i18n verts ; aucun token vert direct détecté dans les nouveaux composants.
