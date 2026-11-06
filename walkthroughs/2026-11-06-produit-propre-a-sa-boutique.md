# Compte rendu, partie 1 : chaque produit appartient à sa boutique

Plan : `plans/2026-11-06-produit-propre-a-sa-boutique.md`.

## Résultat

- **Chaque produit a une boutique propriétaire**, obligatoire. Elle seule le vend et gère sa fiche : contenu et photos, ce qui était déjà le cas, et désormais aussi les offres.
- **Les fiches autrefois communes sont séparées.** Pour chaque autre boutique qui vendait le produit, une copie est créée :
  - le même nom, les mêmes descriptions, la même fiche technique, les mêmes catégories et les mêmes photos publiées ;
  - une adresse propre, par exemple `/marketplace/produits/galaxy-a15-akwa-phone` ;
  - les offres de cette boutique (prix, variantes, statuts) et les avis de ses clients y sont rattachés.

  Chaque boutique peut ensuite modifier sa fiche sans toucher celle des autres.
- **Les produits sans boutique** vont à la boutique de leur plus ancienne offre, ou à **NowTech** s'ils n'en ont aucune.
- **Page produit** : elle ne montre plus que l'offre de la boutique propriétaire. Le menu « Choisir la boutique » disparaît de lui-même, puisqu'il n'y a plus qu'une boutique.
- **Anciennes adresses** : un lien `…/galaxy-a15?boutique=akwa-phone` redirige de façon permanente vers la fiche d'Akwa Phone. Google et les liens déjà partagés ne sont pas perdus.
- **Paniers existants** : un article dont l'offre a été déplacée vers une copie reste reconnu. Le client n'a rien à refaire.
- **Panel** : créer un produit demande maintenant la « Boutique propriétaire ».
- **Espace vendeur** : une boutique ne peut plus créer d'offre sur le produit d'une autre. Elle ne voyait déjà que ses propres produits.

## Ce qui ne change pas

- Commandes, devis et paiements en plusieurs fois : ils gardent l'offre achetée et une copie du nom du produit.
- Les photos copiées réutilisent les mêmes fichiers, qui ne sont jamais effacés du stockage.

## Modifications

- **BackendKati** :
  - migration `20261106140000_produit_propre_a_sa_boutique`, avec son `rollback.sql`. L'annulation retire la contrainte et le lien, mais ne refusionne pas les copies ;
  - `schema.prisma`, `offres.service.ts`, `offres.controller.ts`, `offres.dto.ts` ;
  - tests `produit-boutique.spec.ts` et `offres.service.spec.ts`.
- **websitekati** : `marketplace/produits/[slug]/page.tsx` (redirection).
- **adminkati** :
  - `ProductOwnerField` et `ProductForm` ;
  - le schéma, `products.vue` et `useCatalogueCorrections` ;
  - les traductions ;
  - le test `marketplace-products`.

## Vérification

- **Backend** :
  - 4 nouveaux tests : création par l'équipe sans boutique refusée, offre sur le produit d'une autre boutique refusée, redirection vers la copie, aucune redirection vers sa propre fiche ;
  - le test du panier est mis à jour ;
  - suites marketplace et vendeurs : seuls restent les échecs qui existaient déjà (notifications marketplace, PDF du devis, anciennes migrations sans annulation).
- **Panel** : 10 tests sur 10, vérification de types et contrôles de traduction sans erreur.
- **Site** : vérification de types et lint sans erreur.
- **À faire avant la production** : la migration n'a pas pu être exécutée sur une base, faute de base locale. Elle a été relue, mais il faut la lancer sur une copie de la base de production avant le déploiement.
