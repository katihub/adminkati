# Livraison : villes et quartiers, expédition en agence, « Kati Express »

## Objectif

Lot 2 du plan du 16 octobre, côté panel. La direction tient :

- les **villes et quartiers** que la vitrine propose en listes déroulantes, à la commande et à la création d'une boutique ; une première liste couvre Douala et Yaoundé ;
- la **grille des frais** étendue à l'**expédition en agence** :
  - tarif selon la ville de destination ;
  - paiement complet imposé à la commande.
  - Le **retrait à la boutique** est toujours gratuit et n'a pas de tarif.
- Le libellé **« Kati Express »** désigne la livraison faite par KatiHub, partout dans le panel.

## Contrat backend

- `GET /v1/marketplace/localites` (public) : `[{ ville, quartiers[] }]`, villes et quartiers actifs.
- `GET /v1/marketplace/localites/administration` : la liste complète, avec `id`, `active`/`actif` et `ordre`. Réservé à la direction.
- Écriture (réservée à la direction, journalisée) :
  - `POST …/villes` (`nom`) et `PATCH …/villes/:id` (`nom`, `active`, `ordre`) ;
  - `POST …/villes/:id/quartiers` (`noms[]`) : ajout en lot, les quartiers déjà listés sont ignorés ;
  - `PATCH …/quartiers/:id` (`nom`, `active`, `ordre`).
- `POST /v1/marketplace/livraison/tarifs` accepte désormais `mode: "agence"`.

## Phases

1. **Données** :
   - `app/types/api/localities.ts` et `app/composables/useLocalities.ts` ;
   - clés `localities` ;
   - `DeliveryMode` étendu à `agence`.
2. **Écrans** :
   - l'onglet direction « Villes et quartiers » (`localities`), avec `LocalitiesWorkspace.vue` : ajouter une ville, la masquer ou l'afficher, ajouter des quartiers en lot (un par ligne ou séparés par des virgules), masquer ou réafficher un quartier d'un clic ;
   - la grille des frais : le mode « Expédition en agence » et le libellé « Kati Express » ;
   - les traductions fr et en.
3. **Tests** :
   - `test/nuxt/localities-workspace.test.ts` ;
   - `test/nuxt/delivery-fees-workspace.test.ts`, avec un tarif agence ;
   - `test/nuxt/operations-page.test.ts`, avec le nouvel onglet.
