# Compte rendu — logo, bannière et téléphone des boutiques

Plan : `plans/2026-10-31-logo-banniere-boutiques.md`.

## Ce que voit le client

- **Liste des boutiques** (`/boutiques`) : la bannière remplit le fond du bandeau de la carte, avec un léger voile, et le logo apparaît dans un rond blanc à la place des initiales.
- **Accueil, carrousel des boutiques** : le logo remplace la vignette des initiales, et la bannière apparaît en fond très discret derrière le texte.
- **Page d'une boutique** :
  - la bannière remplace l'image de couverture par défaut ;
  - le logo remplace le rond des initiales ;
  - le téléphone s'affiche dans l'en-tête et dans « À propos ». Il est cliquable pour appeler.
- **Sans visuel**, l'affichage reste celui d'avant : initiales et fond par défaut.

## Ce que fait le vendeur

Espace vendeur > Paramètres de la boutique :
- **Téléphone de la boutique** : un nouveau champ du formulaire. S'il est vide, aucun numéro n'est affiché.
- **Logo et bannière** : une nouvelle section avec l'image actuelle et les boutons « Ajouter », « Remplacer » et « Retirer ».
  - JPEG, PNG ou WebP, 5 Mio au plus.
  - Publiés tout de suite, sans modération.
  - Réservés au propriétaire et au gestionnaire, comme les autres paramètres.

## Ce que fait l'équipe

Panel > Opérations > Candidatures vendeurs > un vendeur > « Boutiques et exploitation » :
- chaque boutique montre son logo, sa bannière et son téléphone public ;
- la direction peut « Retirer le logo » ou « Retirer la bannière » avec un motif d'au moins 5 caractères. Le visuel disparaît aussitôt des pages publiques, et le motif est inscrit au journal.

## Garde-fous

- **Contenu contrôlé** : le serveur vérifie le contenu réel du fichier, pas seulement son nom. Un faux fichier est refusé et signalé. L'analyse de sécurité s'applique comme pour les photos produit.
- **Ancien fichier conservé en cas d'échec** : l'ancien fichier n'est supprimé qu'une fois le nouveau enregistré. Si l'enregistrement échoue, la boutique garde son visuel et le fichier déposé est effacé.
- **Téléphone facultatif** : un champ absent ne change rien, une valeur vide efface le numéro. Les autres champs de la boutique gardent leur comportement.

## Vérification

- **Backend** :
  - 6 nouveaux tests : publication dans le compartiment `branding` et suppression de l'ancien fichier, refus d'un faux fichier, droits du vendeur, retour en arrière si l'enregistrement échoue, retrait par la direction seulement, boutique archivée.
  - 82 tests des vendeurs et des offres passent. La vérification de types passe.
- **Site** : `tsc` et eslint sans erreur ; les 16 tests de contrôle qualité passent.
- **Panel** :
  - 2 nouveaux tests : affichage, retrait avec motif, aucun bouton hors direction ;
  - les tests des écrans voisins passent ;
  - un test de la page Opérations a dépassé son délai de 30 secondes pendant la compilation initiale, et passe quand il est lancé seul ;
  - vue-tsc sans erreur.
- **Non vérifié** :
  - l'affichage avec de vraies images, car la production n'a pas encore ces champs ;
  - l'envoi réel vers le stockage.

## Mise en ligne

1. **Déployer le backend en premier.** La migration `20261031100000_visuels_boutique` ajoute cinq colonnes facultatives ; elle s'applique au démarrage.
2. **Déployer ensuite le site et le panel.**

Les images sont servies par le même stockage que les photos produit, déjà autorisé par le site et par le panel.
