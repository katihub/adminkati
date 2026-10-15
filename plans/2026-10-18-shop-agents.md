# Agents des boutiques : vérification et plafond d'espèces

## Objectif

L'espace vendeur gère désormais les opérations de livraison de la boutique (affectation, prise en charge, code de retrait, dépôt en agence). Une boutique y ajoute ses livreurs et ses employés de comptoir, mais un agent ne peut être affecté qu'une fois **vérifié par KatiHub**. Le panel donne à la direction l'écran de cette vérification, avec le **plafond d'espèces** de l'agent : l'argent qu'il peut garder sur lui avant de le remettre.

## Contrat backend

- `GET /v1/marketplace/expeditions/agents-boutiques?statut=a_verifier|tous` : les agents des boutiques avec leur boutique. Réservé à la direction.
- `POST /v1/marketplace/expeditions/agents/:id/verification` accepte `plafondEspecesFcfa` (facultatif, de 0 à 10 000 000) :
  - sans plafond propre, celui de la ville s'applique ;
  - sans l'un ni l'autre, l'agent ne peut pas recevoir un colis avec de l'argent à encaisser.

## Phases

1. **Données** : `app/types/api/shop-agents.ts`, `app/composables/useShopAgents.ts`, clés `shopAgents`.
2. **Écran** :
   - l'onglet direction « Agents des boutiques » (`shop-agents`) ;
   - `ShopAgentsWorkspace.vue` : le filtre « à vérifier » ou « tous », et une ligne par agent avec sa boutique, son état, son plafond et la vérification ;
   - les traductions fr et en.
3. **Tests** : `test/nuxt/shop-agents-workspace.test.ts` et `test/nuxt/operations-page.test.ts`.
