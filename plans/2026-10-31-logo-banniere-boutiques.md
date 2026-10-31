# Plan — logo, bannière et téléphone des boutiques

## Demande (31 octobre)

- **Liste des boutiques** : la bannière de la boutique remplit le fond du bandeau de la carte, et son logo remplace le rond avec les initiales (« NO », « KA »).
- **Paramètres de la boutique** : le vendeur ajoute ou change son logo, sa bannière et son numéro de téléphone.

## Réponses du 31 octobre

| Question | Réponse |
|---|---|
| Modération du logo et de la bannière | Aucune : ils s'affichent directement |
| Téléphone | Visible par tous sur la page de la boutique, sans bouton WhatsApp |
| Autres coordonnées | Aucune |
| Où afficher | Partout : liste des boutiques, page de chaque boutique, et le carrousel des boutiques de l'accueil, qui affiche lui aussi des initiales |
| Équipe | Elle peut retirer un logo ou une bannière depuis le panel |

## Décisions

- **Base** : cinq colonnes facultatives sur `boutiques` :
  - `logo_url` et `logo_cle` ;
  - `banniere_url` et `banniere_cle` ;
  - `telephone`.
  - Une boutique sans visuel garde l'affichage actuel : initiales et fond coloré.
- **Envoi des images**, par le même chemin que les photos produit :
  - contrôle du contenu réel (JPEG, PNG ou WebP, qui doit correspondre au type annoncé) ;
  - analyse de sécurité ;
  - 5 Mio au plus ;
  - stockage dans le compartiment public `branding`.
  - L'ancien fichier est supprimé après le remplacement, et chaque changement est journalisé.
- **Droits** :
  - le propriétaire ou le gestionnaire de la boutique, comme pour les autres paramètres ;
  - le retrait par l'équipe est réservé à la direction, avec un motif obligatoire, inscrit au journal.
- **Téléphone** : un champ facultatif du formulaire existant `PATCH vendeurs/mes-boutiques/:id`. Un champ absent ne change rien ; une valeur vide efface le numéro. Les autres champs gardent leur comportement actuel.
- **Rien d'existant ne change de comportement** : les nouvelles routes et les nouveaux champs s'ajoutent aux anciens.

## Routes

| Route | Qui | Rôle |
|---|---|---|
| `POST vendeurs/mes-boutiques/:id/visuels/:type` (`logo` ou `banniere`, fichier `fichier`) | Vendeur | Ajouter ou remplacer |
| `DELETE vendeurs/mes-boutiques/:id/visuels/:type` | Vendeur | Retirer |
| `POST vendeurs/boutiques/:id/visuels/:type/retrait` (`motif`) | Direction | Retirer depuis le panel |

## Fichiers

- **BackendKati** :
  - migration `20261031100000_visuels_boutique` et `schema.prisma` ;
  - `vendeurs/visuels-boutique.service.ts` et `visuels-boutique.controller.ts`, avec leurs tests ;
  - le DTO et le service des vendeurs (téléphone et lecture) ;
  - `offres.service.ts` (lectures publiques des boutiques).
- **websitekati** :
  - liste des boutiques ;
  - page d'une boutique ;
  - carrousel des boutiques de l'accueil ;
  - paramètres de la boutique dans l'espace vendeur.
- **adminkati** : fiche des boutiques d'un vendeur (`SellerShops`), avec les visuels, le téléphone et le retrait.
