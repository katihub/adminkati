# Plan — Navigation contextuelle des opérations

## Objectif

Poursuivre le programme `2026-10-28-admin-modernization-program` : remplacer la rangée plate de 25 onglets par le nom du module courant et un sélecteur compact. La sidebar métier reste l'entrée principale. Les URLs existantes et les permissions sont conservées.

## Mise en œuvre

1. `app/pages/operations.vue` : dériver le titre du module sélectionné ; afficher un select natif accessible et localisé ; réutiliser `allowedTabs`, `tabs` et `setActiveTab`.
2. Réutiliser les traductions de navigation pour les quatre libellés actuellement codés en français et ajouter les textes d'aide FR/EN au composant.
3. `test/nuxt/operations-page.test.ts` : vérifier titre contextuel, changement de module, liens historiques et restrictions comptoir/point focal.
4. Vérifier le rendu desktop/mobile, les contrôles clavier, le typecheck et les tests ciblés. Documenter les limites du serveur API de test.

## Critères d'acceptation

- Le titre indique le module effectivement rendu.
- La sélection change l'URL et ne monte qu'un workspace.
- Un module sans autorisation n'apparaît pas dans le sélecteur.
- Aucun composant métier, endpoint ou droit backend n'est modifié.
- Le sélecteur et l'en-tête tiennent à 390 px.

## Limites

Cette tranche conserve `/operations?tab=...` pour la compatibilité. Les routes métier distinctes et les fiches consolidées seront livrées avec leurs propres modules.
