# Walkthrough — Opérations marketplace, phases 6 à 8

Date : 2026-10-09

Plan associé : `plans/2026-10-09-marketplace-operations-phases-6-8.md`

## Résultat fonctionnel

La page Opérations réunit désormais quatre espaces cohérents avec les flux existants :

- caisses et rapprochement des espèces ;
- demandes clients, conservées pour ne pas casser la redirection existante depuis `/assistant` ;
- retours et litiges marketplace ;
- confiance vendeurs, sanctions et réhabilitations.

Les deux nouveaux espaces consomment les API réelles. Aucune donnée factice n'est embarquée dans les composants de production.

## Implémentation

### Administration

- `app/pages/operations.vue`
- `app/components/operations/MarketplaceDisputesWorkspace.vue`
- `app/components/operations/SellerTrustWorkspace.vue`
- `app/composables/useMarketplaceOperations.ts`
- `app/types/api/marketplace-operations.ts`
- `app/utils/api-query-keys.ts`
- `i18n/locales/operations/fr.json`
- `i18n/locales/operations/en.json`

### API

- lecture de la liste et du détail des retours/litiges ;
- lecture de la liste et du détail de la confiance vendeurs ;
- calcul des montants remboursables et exposition des capacités d'action selon l'état et le rôle ;
- maintien des mutations de réception, remboursement, sanction et réhabilitation dans les parcours opérationnels.

Fichiers principaux :

- `src/marketplace/litiges/litiges.dto.ts`
- `src/marketplace/litiges/litiges.controller.ts`
- `src/marketplace/litiges/litiges.service.ts`
- `src/marketplace/reputation/reputation.dto.ts`
- `src/marketplace/reputation/reputation.controller.ts`
- `src/marketplace/reputation/reputation.service.ts`

## Fidélité à la charte graphique KatiHub

| Élément de la charte | Application |
| --- | --- |
| En-tête horizontal existant, sans barre latérale | Conservé via le shell actuel |
| Navigation secondaire | `PillTabs` existant réutilisé |
| Palette | Blanc réel, surfaces `muted`, vert primaire de KatiHub |
| Typographie | Figtree pour le texte et Raleway pour les titres, héritées du thème |
| Structure bureau | Liste maître de 300 px et panneau de détail flexible |
| Sélection active | Carte verte conforme aux états actifs existants |
| Mobile | Liste et détail mutuellement exclusifs pour éviter l'écrasement horizontal |
| Densité | Tableaux, cartes et espacements alignés sur les écrans caisse/assistant existants |

Le quatrième onglet « Demandes clients » est un écart volontaire par rapport au concept visuel à trois onglets : il protège un parcours produit déjà exposé par la redirection `/assistant`.

Le concept de référence corrigé est enregistré dans :

`public/design-concepts/operations-litiges-responsive-2026-10-09.png`

## Vérifications réalisées

- API : 2 suites, 6 tests réussis.
- Build API : réussi.
- Administration : build Nuxt réussi.
- Page Opérations : 6 tests de navigation et d'exclusivité réussis avec le contournement local de `structuredClone` requis par l'environnement de test.
- Typecheck : les seuls échecs restants sont antérieurs à cette intervention dans `app/composables/useApi.ts` et `test/unit/ai-product-copy-service.test.ts`.

## Validation visuelle

Le concept corrigé a été inspecté visuellement et respecte la charte ci-dessus.

La capture finale de l'implémentation reste à refaire : le navigateur intégré n'est pas disponible et le serveur SSR local renvoie actuellement `Either manifest or precomputed data must be provided`. Le dépôt verrouille Nuxt 4.5.2 dans `bun.lock`, alors que `node_modules` contient Nuxt 4.6.0. Ce décalage d'installation empêche le rendu local, sans remettre en cause le build de production réussi.

La prochaine validation doit donc commencer par restaurer les dépendances verrouillées, puis contrôler au minimum :

1. vue bureau des deux nouveaux espaces ;
2. vue mobile liste puis détail ;
3. états vide, chargement, erreur et succès de mutation ;
4. absence de débordement horizontal et conformité des contrastes.
