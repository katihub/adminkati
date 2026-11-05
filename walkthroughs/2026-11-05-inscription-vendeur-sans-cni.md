# Compte rendu : inscription vendeur sans CNI, et identité du particulier

Plan : `plans/2026-11-05-inscription-vendeur-sans-cni.md`.

## Résultat

- **Étape « Sous quel nom vendez-vous ? »** :
  - plus de champ CNI ;
  - une note rappelle que les justificatifs s'envoient ensuite depuis l'espace vendeur.
- **Entreprise** :
  - la dénomination est obligatoire ;
  - le NIU et le RCCM sont marqués « facultatif » ;
  - un champ laissé vide n'est pas envoyé.
- **Particulier** :
  - obligatoires : « Nom et prénom », « Date de naissance » (le calendrier s'arrête à 18 ans), « Lieu de naissance », « Ville de résidence » (liste) et « Quartier de résidence » ;
  - le quartier se choisit dans la liste des quartiers de la ville, ou s'écrit librement par « Autre quartier… » ;
  - facultatifs : le nom et le téléphone d'un fournisseur ou parrain ;
  - en dessous de 18 ans, le formulaire s'arrête : « Vous devez avoir au moins 18 ans pour vendre sur KatiMarket. » Le serveur refuse aussi.
- **Récapitulatif** : il montre la naissance, la résidence et le parrain.
- **Panel**, Opérations > Validation vendeurs : la fiche d'un particulier a un bloc « Vendeur particulier », avec la date et le lieu de naissance, la résidence et le fournisseur ou parrain.
- **Correction au passage** : le serveur exigeait encore une catégorie, alors que le formulaire la rendait facultative depuis le 2 novembre. Une candidature sans catégorie était refusée. Elle passe désormais.

## Modifications

- **BackendKati** :
  - migration `20261105120000_identite_vendeur_particulier`, avec son `rollback.sql` ;
  - `vendeurs.dto.ts` (`InscriptionVendeurDto`) ;
  - `vendeurs.service.ts` (`inscrire`, `estMajeur`).
- **websitekati** :
  - `SellerSignupForm.tsx` ;
  - `devenir-vendeur/seller.module.css` (la note) ;
  - `e2e/inscription-vendeur.spec.ts`.
- **adminkati** :
  - `operations/SellerIdentity` ;
  - `SellerOnboardingWorkspace.vue` ;
  - le type `SellerReviewDetail`.

## Vérification

- **Backend** :
  - 6 nouveaux tests : entreprise sans pièce ni catégorie, particulier enregistré, mineur refusé, 18 ans au jour près, champs exigés du particulier, parrain facultatif mais vérifié ;
  - 21 sur 21 dans `vendeurs.dto` et `vendeurs.service` ;
  - vérification de types sans erreur.
- **Site** :
  - test de bout en bout, sur ordinateur et sur mobile : 6 sur 6 (entreprise sans CNI, NIU ni RCCM ; particulier complet ; mineur bloqué) ;
  - captures de l'étape vérifiées.
- **Panel** : 2 tests (bloc affiché, et masqué pour une entreprise), vérification de types et contrôles de traduction sans erreur.
