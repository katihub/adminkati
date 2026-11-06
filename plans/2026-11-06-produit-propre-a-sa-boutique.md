# Plan : chaque produit appartient à sa boutique, et une fiche produit complète

## Besoin (6 novembre 2026)

- **Plus de fiche commune** : chaque boutique a ses propres produits. Si deux boutiques vendent le même modèle, il existe deux fiches distinctes.
- Les produits sans boutique et sans offre vont à **NowTech**.
- Dans la future fiche complète :
  - **validés par l'équipe** : le nom, les descriptions, les photos et la garantie ;
  - **publiés tout de suite** : le prix, le prix barré, le statut du stock, les catégories, la livraison, le minimum et le délai.

## Trois parties, chacune validée avant la suivante

1. **La propriété** (ce lot) :
   - `propose_par_boutique_id` devient la boutique propriétaire, obligatoire ;
   - les fiches communes sont copiées pour chaque autre boutique qui les vendait ;
   - les offres et les avis suivent leur boutique ;
   - une boutique ne vend que ses produits ;
   - les anciennes adresses `?boutique=…` redirigent ;
   - l'équipe choisit la boutique quand elle crée un produit.
2. **La création complète** : le produit, son prix et ses variantes envoyés ensemble en validation.
3. **La fiche de modification complète** : les sections Général, Médias, Prix et variantes, Vente et livraison, Référencement, sur un seul écran.

## Partie 1 : détail

- **Migration `20261106140000_produit_propre_a_sa_boutique`** :
  1. un produit sans propriétaire va à la boutique de sa plus ancienne offre, ou à NowTech s'il n'a aucune offre ;
  2. chaque autre boutique qui vend le produit reçoit une copie de la fiche, avec un slug `<slug>-<boutique>`, le contenu, les catégories et les photos publiées, plus un lien `copie_de_produit_id` vers la fiche d'origine. Ses offres et les avis de ses clients y sont rattachés ;
  3. la boutique propriétaire devient obligatoire.

  Les photos copiées réutilisent les mêmes fichiers, qui ne sont jamais effacés du stockage.
- **Backend** :
  - la création d'une offre est refusée sur le produit d'une autre boutique ;
  - la création par l'équipe exige une boutique ;
  - `GET marketplace/produits/:slug?boutique=` rend `{ redirection }` vers la copie de cette boutique ;
  - la vérification du panier lit aussi les copies d'une adresse, pour qu'un panier existant retrouve son offre.
- **Site** : la page produit suit cette redirection (permanente).
- **Panel** : le champ « Boutique propriétaire » à la création d'un produit.
