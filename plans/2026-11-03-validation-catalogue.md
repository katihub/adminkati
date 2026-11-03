# Plan : validation des produits, photos visibles et approbation en bloc

## Constat (audit du 03/11)

Pour qu'un produit apparaisse sur la page d'une boutique, cinq conditions doivent être réunies :
- la boutique est active ;
- le vendeur est actif ou sous surveillance ;
- l'**offre** de la boutique est publiée ;
- le **produit** est actif ;
- il reste du stock disponible.

Le parcours d'un nouveau produit compte donc trois validations distinctes dans le panel :
1. **Le produit** (file « Produits ») : la boutique l'a proposé, la validation le rend actif. Il n'est pas encore en vente.
2. **Ses photos et son référencement** (file « Contenus ») : la boutique les envoie avec la proposition. Tant que cette révision n'est pas approuvée, les photos restent « proposées » et la fiche publique n'en a aucune.
3. **L'offre** (file « Offres ») : prix, stock et livraison. La boutique ne peut la créer qu'**après** la validation du produit. L'approbation de l'offre la publie.

Ce qui posait problème :
- La file « Produits » ne montrait aucune photo. Les photos n'étaient visibles que dans la file « Contenus ».
- Approuver un produit ne publiait pas ses photos : le produit passait actif, mais sans image.
- Chaque élément demandait deux clics, « Prendre en charge » puis « Approuver », et il n'existait pas de validation en bloc.

## Changements

- **Backend** :
  - les listes de validation des produits et des offres renvoient les photos du produit, proposées ou déjà publiées ;
  - nouvelles routes `POST /marketplace/moderation/produits/approbation` (`{ produitIds }`) et `POST /marketplace/moderation/offres/approbation` (`{ revisionIds }`), de 1 à 100 éléments. Chaque élément passe par les méthodes existantes : prise en charge si besoin, décision, journal, périmètre du point focal ;
  - **un produit approuvé publie aussi sa révision de contenu ouverte**, c'est-à-dire les photos envoyées avec lui ;
  - un élément refusé (déjà décidé, hors périmètre) n'arrête pas les autres. Il est renvoyé avec son motif.
- **Panel** :
  - les photos s'affichent dans le détail d'un produit et d'une offre ;
  - « Approuver » se fait en un clic pour un produit ou une offre, sans « Prendre en charge » au préalable ;
  - un bouton « Tout approuver (n) », avec confirmation, traite la file affichée (filtres et recherche compris, 100 éléments au plus).
- **Inchangé** :
  - « Demander des modifications » et « Refuser », qui exigent toujours un motif ;
  - la file « Contenus » ;
  - les règles de publication publique.

## Tests

- **Backend** : approbation avec prise en charge et publication des photos, élément déjà en vérification, échec isolé, offres, validation des listes.
- **Panel** : photos affichées, approbation en un clic, « Tout approuver ».
