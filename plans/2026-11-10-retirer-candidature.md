# Plan : retirer la candidature d'un marchand

## Besoin (décidé le 10 novembre 2026)

La direction, et le point focal pour ses boutiques, peuvent **retirer** une candidature de marchand qui n'est pas approuvée : en double, abandonnée, ou à refaire. Une candidature retirée :

- **disparaît de la liste des dossiers**. Un filtre « Retirées » permet de la retrouver ;
- **libère le nom de la boutique et l'adresse e-mail** : la personne peut se réinscrire ;
- **reste dans la base et le journal** : qui l'a retirée, quand, pourquoi. Rien n'est effacé.

## Règles

- **Statuts concernés** : brouillon, soumis, en vérification, modification demandée, refusé. Une candidature **approuvée** ne se retire pas : elle se suspend, comme aujourd'hui.
- **Refusé** si une boutique de la candidature a déjà une commande ou un produit.
- **Motif obligatoire**, 5 caractères au moins.
- Le **compte de connexion** de la personne n'est pas touché : elle reste cliente et peut se réinscrire comme vendeur.

## Ce que fait le retrait, en une transaction

1. Le vendeur passe au nouveau statut de vérification `retiree` et reste `inactif`. Le motif est gardé dans `motifStatut`.
2. Chaque boutique passe en `archivee`, et son slug devient `<slug>-retiree-<6 caractères>`, ce qui libère le nom.
3. Chaque membre de la boutique est désactivé (`actif = false`, `desactiveLe`), ce qui libère l'adresse e-mail.
4. Le journal reçoit `vendeur.candidature_retiree`, avec le motif et les anciens slugs.

## Étapes

1. **Backend** (BackendKati, TDD) :
   - la migration, qui ajoute la valeur `retiree` au type `statut_verification_vendeur` ;
   - `POST /vendeurs/:id/retrait`, avec un motif (direction, point focal) ;
   - la liste des vendeurs n'affiche plus les candidatures retirées, sauf si le filtre le demande.
2. **Panel** (adminkati, TDD) :
   - sur la fiche du dossier, le bouton **Retirer la candidature** et une fenêtre de confirmation avec le motif ;
   - le statut « Retirée » et le filtre correspondant dans la liste.
3. **Tests** : Jest pour le backend (droits, périmètre, statuts, commandes et produits, libération du nom et de l'adresse), Vitest pour le panel.
