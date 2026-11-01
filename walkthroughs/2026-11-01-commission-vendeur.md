# Walkthrough : modifier le taux de commission d'un vendeur

Plan : [plans/2026-11-01-commission-vendeur.md](../plans/2026-11-01-commission-vendeur.md)

## Résultat

1. Dans **Opérations → Candidatures vendeurs**, ouvrir un vendeur. Dans « Boutiques et exploitation », le **taux de commission** s'affiche avec un bouton **Modifier**, visible par la direction seulement.
2. La fenêtre demande le nouveau taux, en %, avec virgule acceptée (par exemple 7,5), et un motif.
   - Elle rappelle que le taux ne s'applique qu'aux nouvelles commandes.
   - « Enregistrer le taux » reste désactivé si le taux est hors de 0 à 100, identique à l'actuel, ou si le motif fait moins de 5 caractères.
3. Après l'enregistrement, un message confirme le nouveau taux et la fiche se met à jour.

## Modifications

- **BackendKati** :
  - `src/vendeurs/vendeurs.dto.ts` : `ModifierCommissionVendeurDto` ;
  - `src/vendeurs/vendeurs.service.ts` : `modifierCommission`, en transaction, avec écriture au journal ;
  - `src/vendeurs/vendeurs.controller.ts` : `POST /vendeurs/:id/commission`, réservé à la direction ;
  - `src/vendeurs/vendeurs-commission.spec.ts` : 3 tests.
- **adminkati** :
  - `app/components/operations/SellerCommission/SellerCommission.vue` (nouveau) ;
  - `app/utils/commission.ts` : conversion entre pourcentage et points de base, avec son test unitaire ;
  - `SellerShops.vue` l’utilise à la place de la ligne de lecture seule ;
  - `test/nuxt/seller-commission.test.ts` : 3 tests.

## Vérifications

- Backend :
  - `vendeurs-commission.spec.ts` et `vendeurs-point-focal.spec.ts` : 10 tests sur 10 ;
  - `tsc` et `eslint` sans erreur.
- Panel :
  - `seller-commission`, `admin-domain-records`, `shop-members` et `shop-visuals` : tous verts ;
  - `vue-tsc` sans erreur.

## À savoir

- Le backend doit être déployé avant le panel. Sinon, l'enregistrement répond « introuvable ».
- Les commandes déjà passées, y compris celles qui sont en cours, gardent leur taux. Un devis accepté ou un paiement en plusieurs fois converti après le changement prend le nouveau taux, puisque la commande est créée à ce moment-là.
