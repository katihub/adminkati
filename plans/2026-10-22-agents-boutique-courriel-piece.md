# Agents de boutique : e-mail et pièce d'identité

## Objectif

Quand une boutique ajoute un agent (livreur ou employé du comptoir), elle renseigne aussi son adresse e-mail, obligatoire, et le numéro de sa pièce d'identité, facultatif. L'équipe KatiMarket, qui vérifie chaque agent avant sa première livraison, voit ces deux informations dans l'onglet « Agents boutiques ».

## Décisions

- Backend : deux colonnes facultatives sur `agents_livraison` (`courriel`, `numero_piece_identite`) et une adresse unique par boutique, comme le téléphone. Facultatives en base pour les agents existants et ceux de KatiMarket ; l'e-mail est exigé par le service lors de la création par une boutique.
- Le numéro de pièce n'est rendu qu'à la boutique propriétaire et à l'équipe (sélection `AGENT_PUBLIC`, qui ne sert à aucune vue client).
- Admin : affichage seulement, dans la ligne de l'agent ; aucune saisie côté panel.

## Vérification prévue

Tests du service (champs enregistrés, e-mail exigé, doublons lisibles, validation du DTO), test du composant admin, essai réel dans l'espace vendeur.
