# Walkthrough : le téléphone des vendeurs dans le panel

Plan : [plans/2026-11-01-telephone-vendeur.md](../plans/2026-11-01-telephone-vendeur.md)

## Résultat

Dans **Opérations → Candidatures vendeurs**, ouvrir un vendeur. Pour chaque boutique, la section **Membres de la boutique** montre :
- le nom ;
- l'e-mail, cliquable ;
- le **téléphone**, cliquable pour appeler. Pour le propriétaire, c'est le numéro saisi à l'inscription. Sans numéro, « Téléphone non renseigné » s'affiche ;
- les rôles et l'état actif ou inactif.

Le logo, la bannière et le téléphone public de la boutique restent affichés au-dessus, comme avant.

## Modifications

- **BackendKati** :
  - `src/vendeurs/vendeurs.service.ts` : `lire` sélectionne `telephone` pour les membres ;
  - test ajouté dans `vendeurs-point-focal.spec.ts`.
- **adminkati** :
  - `app/types/api/marketplace-moderation.ts` : type des membres complété ;
  - `app/components/operations/ShopMembers/ShopMembers.vue` : liens d'appel et d'e-mail, cas sans numéro ;
  - test `test/nuxt/shop-members.test.ts`.

## Vérifications

- Backend : `vendeurs-point-focal.spec.ts`, 7 tests sur 7.
- Panel :
  - `shop-members.test.ts` et `shop-visuals.test.ts` passent ;
  - `vue-tsc` passe sans erreur.

## À savoir

Le backend doit être redéployé pour que le numéro apparaisse dans le panel. Avant ce redéploiement, le panel affiche « Téléphone non renseigné ».
