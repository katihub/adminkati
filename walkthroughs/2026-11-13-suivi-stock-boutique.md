## What I built

Le suivi quantitatif du stock est maintenant un choix par boutique, réservé au propriétaire et au gestionnaire. Les offres non comptées conservent leur statut manuel ; les autres sont limitées au disponible, changent automatiquement de statut et récupèrent leur quantité lors des libérations et des retours reçus.

L'espace vendeur permet d'activer le suivi et d'effectuer un ajout, un retrait ou un inventaire motivé. Le site borne le panier et annonce les stocks de 1 à 4 unités ; l'administration distingue le suivi quantitatif du statut manuel et affiche les quantités.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Migration `quantite_renseignee` et retour arrière | Done | `../BackendKati/prisma/migrations/20261113120000_suivi_stock_boutique/` |
| Disponibilité, statut automatique et maintien du réapprovisionnement manuel | Done | `../BackendKati/src/marketplace/suivi-stock.ts`, `../BackendKati/src/marketplace/offres.service.ts` |
| Réservation, paiement, expiration et paiement en plusieurs fois | Done | `../BackendKati/src/marketplace/commandes/`, `../BackendKati/src/marketplace/echelonnement/`, `../BackendKati/src/marketplace/finance/` |
| Remise en stock à la réception d'un retour | Done | `../BackendKati/src/marketplace/litiges/litiges.service.ts` |
| Activation par propriétaire ou gestionnaire | Done | `../BackendKati/src/vendeurs/vendeurs.service.ts`, `../BackendKati/src/vendeurs/vendeurs.controller.ts` |
| Réglage et inventaire dans l'espace vendeur | Done | `../websitekati/src/components/marketplace/SellerWorkspace.tsx` |
| Stock faible et panier limité | Done | `../websitekati/src/lib/stock.ts`, `../websitekati/src/lib/cart.tsx`, composants du catalogue et du panier |
| Visibilité administration | Done | `app/components/operations/MarketplaceOffersWorkspace.vue`, `app/types/api/marketplace-catalogue-admin.ts` |

## Deviations

- L'administration expose le mode de suivi directement dans chaque ligne du catalogue d'offres, à côté de la boutique et des quantités. Cela réutilise l'espace de pilotage existant au lieu d'ajouter un nouvel écran de boutiques.
- Le seuil « faible » a été interprété strictement : 1 à 4 unités, puisque la décision dit « en dessous de 5 ».
- Une offre créée sans quantité ne reçoit plus implicitement une quantité initiale depuis l'interface vendeur. Elle reste ainsi au statut manuel jusqu'au premier inventaire, conformément à la décision de passage progressif.

## Tests

- Backend ciblé : 10 suites, 120 tests passés (`pnpm.cmd test ... --runInBand`). Cela couvre la règle, les statuts, le catalogue admin, les corrections, la création d'offres et variantes, les commandes, l'échelonnement, l'acompte et les retours.
- Backend : `pnpm.cmd run build` passé ; ESLint sur les fichiers du chantier passé sans erreur.
- Backend global : 227 suites et 3 084 tests passent, mais la commande globale reste rouge avec 8 suites et 72 tests hors périmètre (mocks `ProductImportService`, notifications push, SQL vitrine, scripts de sauvegarde Windows et anciens rollbacks). Le seul échec lié au chantier, le mock de variante, a été corrigé puis inclus dans les 120 tests ciblés passants.
- Site : 49 tests passés ; `npm.cmd run typecheck` passé ; `npm.cmd run lint` passé avec 6 avertissements préexistants et aucune erreur ; `npm.cmd run build` passé malgré l'API locale absente pendant la génération statique.
- Admin : `marketplace-offers-workspace.test.ts` passe (3 tests) ; typecheck Nuxt, contrôles de traductions et de clés, formatage ciblé et lint ciblé passent.

## Not done

- La migration est prête mais n'a pas été appliquée à une base ni déployée.
- Aucune recette visuelle connectée à une base de démonstration n'a été exécutée ; les validations effectuées sont automatisées et de compilation.

## Notes for the reviewer

- Les réservations déjà ouvertes continuent leur cycle lorsque le suivi est désactivé ; les quantités restent conservées en base.
- Le refus de ligne reste volontairement interdit aux boutiques qui suivent leur stock.
- Les retours reçus réaugmentent une quantité déjà renseignée même si la boutique a désactivé le suivi entre-temps ; le statut n'est recalculé que si le suivi est encore actif.
