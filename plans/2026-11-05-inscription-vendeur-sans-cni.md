# Plan : inscription vendeur sans CNI, et identité du particulier

## Besoin

- **Plus de CNI** à la création d'un compte marchand, pour une entreprise comme pour un particulier.
- **Entreprise** : le NIU et le RCCM ne sont plus obligatoires. L'espace documents les recueille ensuite et le système les rappelle au vendeur.
- **Particulier** :
  - obligatoires : nom et prénom (un seul champ), date de naissance (18 ans au moins), lieu de naissance, ville de résidence et quartier de résidence (des listes) ;
  - facultatifs : nom et téléphone d'un fournisseur ou parrain. Le numéro n'est vérifié que s'il est rempli.

## Étapes

1. **Backend** :
   - migration `20261105120000_identite_vendeur_particulier`, qui ajoute six colonnes facultatives à `vendeurs` ;
   - `InscriptionVendeurDto` : les champs du particulier sont exigés quand `type = personne_physique`, le parrain reste facultatif ;
   - `inscrire` :
     - la CNI devient facultative (une pièce jointe quand même est contrôlée et gardée comme avant) ;
     - les catégories deviennent facultatives, comme le formulaire depuis le 2 novembre : le serveur les exigeait encore ;
     - le refus est en dessous de 18 ans, au jour près à l'heure de Douala.
2. **Site** (`SellerSignupForm`) :
   - l'étape « Votre activité » sans CNI, avec NIU et RCCM facultatifs ;
   - les champs du particulier : ville et quartier tirés des localités tenues dans le panel, avec « Autre quartier » ;
   - le récapitulatif.
3. **Panel** : la fiche d'une candidature montre la naissance, la résidence et le parrain d'un particulier (`SellerIdentity`).
