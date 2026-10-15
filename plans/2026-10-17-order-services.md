# Services de commande : assurance KATI et assistance à l'installation

## Objectif

Lot 4 du plan du 16 octobre, côté panel. La direction règle les services payants que KatiHub vend à la commande :

- l'**assurance KATI** : un pourcentage des produits seuls, cochée par défaut au paiement, que le client peut décocher ; la direction la suspend ou change son taux ;
- l'**assistance à l'installation** : un prix fixe par commande, pour chaque catégorie où KatiHub installe les produits.

## Contrat backend

- `GET /v1/marketplace/services-commande/reglages` et `PATCH …/reglages` (`assuranceActive`, `assuranceTauxBps` de 0 à 3 000), réservés à la direction et journalisés.
- `PATCH /v1/marketplace/categories/:id` accepte `installationActive` et `installationPrixFcfa`.
  - L'installation ne s'active pas sans prix (400).
  - Une sous-catégorie sans réglage propre suit sa catégorie.
- La vitrine lit `GET /v1/marketplace/services-commande?offres=` (public) pour proposer les options du panier.

## Phases

1. **Données** : `app/types/api/order-services.ts`, champs d'installation dans `marketplace-categories.ts`, `app/composables/useOrderServices.ts`, clés `orderServices`.
2. **Écran** :
   - l'onglet direction « Services de commande » (`order-services`), avec `OrderServicesWorkspace.vue` : le taux en %, et une ligne par catégorie et sous-catégorie (prix, proposer, changer le prix, ne plus proposer) ;
   - les traductions fr et en.
3. **Tests** : `test/nuxt/order-services-workspace.test.ts`, `test/nuxt/operations-page.test.ts`.
