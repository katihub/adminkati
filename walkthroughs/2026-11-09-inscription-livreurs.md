# Compte rendu : inscrire un livreur KATI depuis l'onglet Kati Express

Plan : `plans/2026-11-09-inscription-livreurs.md`.

## Résultat

- **Le bouton « Inscrire un livreur »**, dans l'onglet Kati Express, est ouvert à la direction et au point focal. Il ouvre un formulaire en quatre parties :
  - **Identité** : nom et prénom, date et lieu de naissance (18 ans au moins), e-mail, téléphone ;
  - **Résidence** : ville et quartier, pris dans les localités, avec la possibilité de saisir un autre quartier ;
  - **Parrain**, facultatif : nom, lien, téléphone ;
  - **Zone de livraison** : la ville, préremplie avec la ville de résidence, et les quartiers à cocher, avec Tout cocher / Tout décocher.
- **Un seul envoi crée tout** : le membre d'équipe avec le rôle livreur, le livreur Kati Express et l'invitation à choisir son mot de passe. Si l'invitation ne part pas, le panel le dit, et elle peut être renvoyée depuis Équipe.
- **Inscrit par la direction**, le livreur est vérifié tout de suite. **Inscrit par un point focal**, il est « à vérifier » :
  - il peut recevoir une livraison déjà payée ;
  - une livraison avec des espèces lui est refusée : « Livreur à vérifier : il ne peut pas encore encaisser d'espèces » ;
  - la direction le vérifie et fixe son plafond, comme avant.
- **Le point focal** :
  - il voit l'onglet Kati Express, réduit à la liste de ses livreurs : la file de répartition reste à la direction ;
  - il n'inscrit et ne voit que les livreurs des villes de ses boutiques.
- **La liste des livreurs** affiche aussi :
  - la résidence ;
  - le parrain ;
  - les quartiers de livraison, dépliables ;
  - la mention « À vérifier ».
- **Les suggestions de répartition** :
  - un livreur qui couvre le quartier du client passe devant, avec la raison « Livre dans ce quartier » ;
  - un livreur à vérifier est montré, mais bloqué pour une livraison avec espèces.
- **Comptes utilisateurs** passe du menu Clients au menu **Administration**.

## Fichiers

- **BackendKati** :
  - la migration `20261109150000_inscription_livreurs` (colonnes sur `agents_livraison`) ;
  - `livraisons/livreurs-kati.service.ts` et `livreurs-kati.dto.ts` ;
  - les routes `POST /marketplace/kati-express/livreurs` et `PATCH .../livreurs/:id/quartiers` ;
  - `GET .../livreurs`, ouvert au point focal ;
  - la règle d'attribution dans `livraisons.service.ts`, et `kati-express-suggestion.ts` ;
  - l'export de `InvitationsCompteService`.
- **adminkati** :
  - `KatiExpressCourierForm.vue`, `KatiExpressCouriers.vue`, `KatiExpressCourierItem.vue` et `KatiExpressWorkspace.vue` (vue du point focal) ;
  - `useKatiExpress.ts` ;
  - `utils/courier-registration.ts` ;
  - l'onglet du point focal et le menu Administration.

## Tests

- **BackendKati** :
  - `livreurs-kati.spec.ts` (5 tests) : direction, point focal, villes, quartiers, doublon, âge, parrain facultatif ;
  - l'attribution d'une livraison sans espèces à un livreur à vérifier (refusée avec espèces, et toujours refusée pour un agent de boutique non vérifié) ;
  - les suggestions : quartier couvert, livreur à vérifier.
- **adminkati** :
  - `courier-registration.test.ts` (4 tests) ;
  - `kati-express-couriers.test.ts` (2 tests d'écran : la vue du point focal sans la file, et l'inscription sans parrain) ;
  - la navigation et les onglets du point focal mis à jour.
- **Échecs qui existaient déjà** : bannières, palette, langue, métadonnées, et le délai dépassé du test des onglets lors d'un passage complet.
