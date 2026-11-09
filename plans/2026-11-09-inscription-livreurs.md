# Plan : inscrire un livreur KATI depuis l'onglet Kati Express

## Besoin (décidé le 9 novembre 2026)

La direction ou un point focal inscrit un livreur Kati Express **en un seul formulaire**, depuis l'onglet Kati Express.

| Champ | Obligatoire |
| :-- | :-- |
| Nom et prénom | oui |
| Date et lieu de naissance | oui (18 ans au moins) |
| Ville et quartier de résidence | oui |
| Adresse e-mail | oui |
| Téléphone | oui |
| Nom du parrain | non |
| Lien avec le parrain | non |
| Téléphone du parrain | non |
| Ville et quartiers de livraison | oui (un quartier au moins, pris dans les localités de la ville) |

Décisions :

1. **Inscrit par la direction**, le livreur est vérifié tout de suite. **Inscrit par un point focal**, il est « à vérifier » : il peut recevoir les livraisons déjà payées, mais pas une livraison avec des espèces à encaisser, tant que la direction ne l'a pas vérifié et n'a pas fixé son plafond.
2. **Le point focal** n'inscrit et ne voit que les livreurs des villes de ses boutiques.
3. **Le parrain est facultatif.**

Aussi : l'entrée **Comptes utilisateurs** passe du menu Clients au menu **Administration**.

## Ce que ça change ailleurs

- **Attribution d'une livraison** : un livreur KATI non vérifié peut maintenant recevoir une livraison **sans espèces**. Aujourd'hui, il n'en recevait aucune. Rien ne change pour les agents des boutiques.
- **Suggestions de livreurs** :
  - un livreur qui couvre le quartier du client passe devant ;
  - un livreur non vérifié est montré, mais bloqué pour une livraison avec espèces.
- **Le point focal voit l'onglet Kati Express**, réduit à ses livreurs : la file de répartition reste à la direction.

## Étapes

1. **Backend** (BackendKati, TDD) :
   - **Migration**, sur `agents_livraison` :
     - date et lieu de naissance ;
     - ville et quartier de résidence ;
     - nom, lien et téléphone du parrain ;
     - ville de livraison et quartiers de livraison (`text[]`).
   - **`POST /marketplace/kati-express/livreurs`** (direction, point focal), en une transaction :
     - le membre d'équipe, avec le rôle `livreur` ;
     - l'agent Kati Express, vérifié si la direction l'inscrit ;
     - le journal `kati_express.livreur_inscrit`.
     
     L'invitation (choisir son mot de passe) part ensuite, comme pour un membre de l'équipe.
   - **Contrôles** :
     - une adresse déjà connue de l'équipe est refusée ;
     - la ville de livraison doit être dans les localités, et pour un point focal parmi les villes de ses boutiques ;
     - les quartiers doivent appartenir à cette ville ;
     - le livreur doit avoir 18 ans au moins.
   - **`GET .../livreurs`** : ouvert au point focal (ses villes seulement), et renvoie aussi la résidence, le parrain, les quartiers et « à vérifier ».
   - **`PATCH .../livreurs/:id/quartiers`** : changer les quartiers de livraison.
   - **`affecter`** : un agent KATI non vérifié est accepté pour une livraison sans espèces.
   - **`suggererLivreurs`** : les deux règles décrites plus haut (quartier couvert en premier ; espèces bloquées si « à vérifier »).
2. **Panel** (adminkati, TDD) :
   - dans Kati Express : le bouton **Inscrire un livreur** et son formulaire (villes et quartiers lus dans les localités) ;
   - la liste des livreurs, avec la résidence, le parrain, les quartiers et le badge « à vérifier » ;
   - l'onglet est ouvert au point focal, qui ne voit que la partie Livreurs ;
   - l'entrée de menu Comptes utilisateurs passe dans Administration.
3. **Tests** : Jest pour le backend (droits, périmètre, contrôles, attribution sans espèces, suggestions), Vitest pour le panel.
