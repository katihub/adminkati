# Plan : trier et suivre les candidatures vendeurs

## Besoin (décidé le 12 novembre 2026)

Sur l'écran **Candidatures vendeurs**, l'équipe :

1. ne voit pas, dans la liste, si un dossier contient des pièces jointes ;
2. ne distingue pas un dossier **complété** après un refus d'un dossier neuf ;
3. navigue mal entre les dossiers soumis, en attente du vendeur, validés, refusés.

## Règles

### Onglets (remplacent le menu déroulant de statut)

| Onglet | Dossiers | Tri |
|---|---|---|
| **À traiter** (par défaut) | brouillon, soumis ou en vérification, avec au moins une pièce | dernier dépôt, le plus ancien d'abord |
| **Attente vendeur** | modification demandée | dernière modification, la plus récente d'abord |
| **Sans pièce** | brouillon, soumis ou en vérification, sans aucune pièce | inscription, la plus ancienne d'abord |
| **Validés** | approuvé | dernière modification |
| **Refusés** | refusé | dernière modification |
| **Retirés** | retiré | dernière modification |

Chaque onglet affiche son compteur ; la recherche et le périmètre du point focal s'appliquent aux compteurs. L'onglet, la recherche et la page sont dans l'adresse.

### Carte de la liste

- nombre de pièces, et le nombre à vérifier ; **Aucune pièce** sinon ;
- badge **Complété** quand le vendeur a déposé une pièce alors que son dossier attendait une modification ;
- badge **Déjà validé** quand un vendeur approuvé a déposé une nouvelle pièce (renouvellement) ;
- date du **dernier dépôt** en premier, date d'inscription ensuite.

### Fiche du dossier

- **pièces requises** : l'état de chaque pièce (valide, à vérifier, refusée, expirée, manquante), la même règle que l'espace vendeur (`pieces-requises.ts`) ;
- **documents rangés par type** : la version en vigueur en haut, marquée **Nouveau** si elle a été déposée après le dernier refus d'une pièce de ce type ; les versions remplacées sont repliées ;
- **historique** tiré du journal : inscription, dépôts, prises en charge, décisions et motifs (sans adresse IP ni agent).

### Enchaînement

Après une décision sur le dossier, la fiche suivante de la liste s'ouvre. Des boutons **Précédent / Suivant** parcourent la page en cours.

## Données (BackendKati)

Deux colonnes sur `vendeurs` :

- `derniere_soumission_le` : posée à chaque dépôt de pièce (inscription comprise) ;
- `resoumis` : vrai quand une pièce est déposée alors que le dossier est en `modification_demandee` ; remis à faux par une décision sur le dossier ou un retrait.

La migration remplit ces colonnes pour les dossiers existants à partir des documents.

## Hors périmètre

Le passage d'un vendeur **approuvé** à `soumis` quand il dépose une pièce n'est pas modifié ici : le badge **Déjà validé** le signale seulement. Ce comportement bloque les retraits d'argent (`finance-vendeur.service.ts`, qui exige `approuve`) : décision à prendre séparément.

## Étapes

1. **Backend** : migration, mise à jour des colonnes, liste par onglet avec compteurs, pièces et historique dans la fiche. Tests Jest.
2. **Panel** : onglets, carte enrichie, fiche (pièces requises, documents par type, historique), enchaînement. Tests Vitest.
