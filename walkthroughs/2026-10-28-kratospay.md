# Walkthrough — Kratospay remplace Fapshi

Plan : `plans/2026-10-28-kratospay.md`. Les lots 1 à 7 sont réalisés ; la recette réelle attend les clés Kratospay.

## Résultat

Tout l'argent de KatiMarket passe par **Kratospay**. Fapshi est retiré du code, de la configuration et des écrans ; son historique reste lisible en base.

| Flux | Acteur | Comment |
|---|---|---|
| Payer une commande (connecté, sans compte) | Client, site et appli | Demande sur le téléphone (Orange Money, MTN MoMo), suivi de la commande à l'écran |
| Payer un versement en plusieurs fois | Client | Même parcours |
| Faire payer une commande du magasin | Comptoir, direction, **livreur de la commande** | Panel, commande → « Faire payer par mobile money » |
| Faire payer le reste dû à la porte | **Livreur** (marketplace) | Espace livreur → « Faire payer par mobile money ». Confirmé, l'argent va à la plateforme, jamais dans la caisse du livreur ; la livraison se confirme ensuite par le code, sans espèces |
| Verser son solde à un vendeur | Direction | Décaissement Kratospay vers le numéro du vendeur |
| Rembourser un retour, une ligne refusée | Direction | Décaissement Kratospay |
| Rembourser un paiement en plusieurs fois en défaillance | Direction | **Nouveau** : « Rembourser par Kratospay » ; le marquage manuel reste pour un remboursement hors passerelle |
| Suivre la passerelle | Direction | Onglet **Passerelle de paiement** : configuration, tentatives en attente ou refusées, vérification chez Kratospay |

**Règles de sécurité**
- **Rien n'est encaissé sans confirmation de Kratospay**, par l'une de ces trois voies seulement : sa réponse à notre appel, sa notification signée (HMAC-SHA256 du corps brut), ou la consultation du statut.
- **La demande est écrite avant l'appel**, avec une référence de tentative unique.
- **Une notification rejouée ne compte rien deux fois.** Une référence inventée n'est jamais appliquée.
- **Une issue inconnue** (coupure réseau après l'envoi) laisse la tentative en attente. Pour un décaissement, elle bloque toute relance tant qu'il n'est pas rapproché : on ne paie jamais deux fois.
- **Toutes les protections existantes sont gardées** :
  - le montant est relu en base ;
  - chacun ne fait payer que ce qui lui revient (client, comptoir dans son périmètre, livreur de sa commande) ;
  - une commande fermée n'est pas encaissée ;
  - un surplus est signalé.
- **Les frais Kratospay sont pris en charge par KatiMarket** : le client paie le montant affiché, et le vendeur reçoit son solde entier.

## Backend

- **Client Kratospay** (`src/paiements/kratospay/`) : encaissement, décaissement, consultation, vérification des notifications, certification. Il normalise les statuts et distingue un refus franc d'une issue inconnue.
  - Opérateur choisi par le client, ou déduit du préfixe camerounais.
  - Numéro normalisé au format `2376XXXXXXXX`.
- **Routes** :
  - client et équipe : `POST /paiements/direct`, `/paiements/sans-compte/direct`, `/paiements/echelonnement/direct`, `/paiements/expeditions/:id/direct` ;
  - Kratospay : `POST /paiements/kratospay/notification`, la seule adresse de notification, qui sert aux encaissements comme aux décaissements ;
  - direction : `GET /paiements/kratospay/certification`, `GET /paiements/kratospay/transactions`, `POST /paiements/kratospay/transactions/:id/consultation` ; `POST /marketplace/remboursements/:retourId/rapprocher` ; `POST .../plans/:ref/remboursement/passerelle` et `.../remboursement/rapprocher`.
- **Reprise** : chaque minute, les tentatives en attente sont consultées chez Kratos, dès que la consultation est configurée.
- **Migrations**, toutes avec retour arrière, appliquées au démarrage du backend :
  - `20261028100000_kratospay` : `paiements_fapshi` devient `paiements_passerelle`, avec une colonne `passerelle` ; même colonne sur les décaissements ;
  - `20261028110000_remboursement_echelonnement` : remboursement d'un plan ;
  - `20261028120000_paiement_porte` : paiement à la porte.

## Configuration à poser en production

```
KRATOSPAY_BASE=https://api.kratospay.com        # à confirmer par Kratos
KRATOSPAY_CLE_PUBLIQUE=<clé live>
KRATOSPAY_SECRET_NOTIFICATION=<secret partagé, 16 caractères au moins>
```

- **Adresse de notification** à déclarer chez Kratos : `https://<api>/v1/paiements/kratospay/notification`.
- **Paramètres facultatifs**, à ajuster selon les réponses de Kratos : `KRATOSPAY_ENTETE_SIGNATURE`, `KRATOSPAY_CHEMIN_STATUT` (sans lui, pas de reprise automatique), `KRATOSPAY_CHEMIN_PAYIN`, `KRATOSPAY_CHEMIN_PAYOUT`, `KRATOSPAY_OPERATEUR_ORANGE`, `KRATOSPAY_OPERATEUR_MTN`, `KRATOSPAY_DELAI_MS`.

## Vérifications

- **Backend** :
  - client Kratospay contre un faux serveur (12 tests) ;
  - encaissements, droits, notification, reprise, porte (74 tests) ;
  - décaissements, remboursements, plans (120 tests) ;
  - livraison (paiement à la porte).
- **Recettes** :
  - le parcours marketplace complet passe sur la base de recette : acompte encaissé par notification, retour remboursé par décaissement, retrait vendeur versé ;
  - sur le backend local avec un faux Kratospay : certification, signature fausse refusée (403), référence inventée ignorée.
- **Site** :
  - tests de bout en bout des paiements (versements, commande sans compte, règlement) ;
  - nouveau test : le livreur fait payer à la porte puis confirme à 0.
- **Panel** : onglets par rôle (73 tests) ; passerelle, remboursement d'un plan et paiement mobile d'une commande (3 tests) ; lint, traductions, types et fallow au vert.

## Ce qui attend Kratos

- **La spécification des webhooks** (en-tête, algorithme, nouvelles tentatives) : le code suppose HMAC-SHA256 sur le corps brut, avec un en-tête paramétrable.
- **La consultation du statut** : sans elle, pas de reprise automatique, et le bouton « Vérifier chez Kratospay » répond que la consultation n'est pas configurée.
- **L'adresse et les numéros du bac à sable**, et la bonne adresse de production.
- **Une signature ou une clé secrète pour les décaissements** : aujourd'hui, une clé publique seule suffit.
- **Le paiement par carte** : prévu, mais non documenté par Kratos. Il se branchera sur le même client.

## Limites

- **Agent de livraison d'une boutique** : il ne peut pas encore faire payer à la porte par mobile money, car la route n'accepte que l'équipe KatiMarket et la direction. Il garde les espèces.
- **Recette par HTTP** : l'appel sortant vers Kratos n'a pas pu être fait sur le backend local, faute de commande payable (la clôture juridique de la marketplace n'est pas validée en local). Il est couvert par les tests contre le faux serveur et par la recette marketplace.
- **Appli mobile (`mobilekati`)** : l'adresse de paiement et deux textes sont modifiés, mais **non commités**, comme demandé.
- **Échecs déjà présents, sans rapport** :
  - tests des notifications marketplace (`appareilPush` absent des faux) ;
  - PDF de devis (`pdf-parse`) ;
  - recette catalogue (quartier absent des données de recette) ;
  - dépôt d'un justificatif sur l'espace vendeur (deux champs de fichier).
