# Kratospay : brancher l'agrégateur sur tous les paiements de KatiMarket

Statut : validé le 28 octobre 2026, en cours de réalisation. Les clés Kratospay seront fournies en dernier.

## 1. Ce que dit la documentation Kratospay

Source : https://kratospay.com/en/developers (lue le 28 octobre 2026).

**Ce qui est documenté**
- **Encaissement (cash-in)** : `POST /api/v1/live/payin`.
  - Champs : `amount`, `currency` (`XAF`), `phoneNumber` (avec 237), `operator`, `reference` (unique), `description`.
  - Le client paie depuis son téléphone. Il n'y a pas de page de paiement hébergée, ni d'adresse de retour.
- **Décaissement (cash-out)** : `POST /api/v1/live/payout`, avec les mêmes champs. Il envoie de l'argent sur un numéro mobile money.
- **Authentification** : un seul en-tête, `X-MoK-Public-Key`. Pas de clé secrète, pas de signature de requête.
- **Statuts** : `PENDING`, `SUCCESS`, `FAILED`.
- **Erreurs** : `{ success: false, error: { code, message, details }, meta: { request_id } }`. Codes : `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`, `RATE_LIMITED`, `NOT_FOUND`.
- **Pays et opérateurs** : Cameroun (Orange Money `orange_money_cm`, MTN MoMo `mtn_momo_cm`), Congo, Gabon, Tchad, RDC, Centrafrique, Guinée équatoriale.

**Ce qui manque, et qui bloque une mise en production sûre**

| Manque | Pourquoi c'est bloquant |
|---|---|
| **Webhooks** (page en 404) : format, en-tête et algorithme de signature, nouvelles tentatives | Un paiement mobile money se confirme plusieurs secondes ou minutes après la demande. Sans notification signée, on ne sait pas, de façon sûre, quand le client a validé. |
| **Consultation du statut** d'une transaction | Il faut pouvoir se rattraper quand une notification se perd, et rapprocher un paiement contesté. |
| **Bac à sable** : adresse et numéros de test | Impossible de tester sans déplacer de l'argent réel. |
| **Adresse de l'API** : deux adresses différentes (`api.kratospay.com` et `dev-aggregator-api.kratospay.com`) | Il faut savoir laquelle est la bonne. |
| **Clé publique seule** pour déplacer de l'argent | Le décaissement envoie de l'argent : une simple clé publique, sans secret ni signature, est fragile. À confirmer. |
| **Remboursement** : pas d'API dédiée | On rembourserait par un décaissement vers le numéro du client. À confirmer. |
| **Idempotence** : `reference` refusée si elle est déjà utilisée ? | Sinon, une nouvelle tentative réseau peut encaisser ou payer deux fois. |
| **Frais, délais de versement, plafonds, minimums, solde du compte** | Utiles pour les montants minimums, les commissions et le pilotage de la trésorerie. |
| **Paiement par carte** : mentionné, non documenté | À confirmer si vous voulez la carte. |

**Questions à envoyer à Kratos avant tout développement**
1. La spécification des webhooks : configuration, contenu, en-tête et algorithme de signature, nouvelles tentatives.
2. L'API de consultation du statut d'un encaissement et d'un décaissement.
3. L'adresse et les numéros de test du bac à sable.
4. La bonne adresse de production.
5. Une clé secrète ou une signature HMAC pour les décaissements. Peut-on limiter le décaissement par adresse IP ?
6. Une `reference` déjà utilisée est-elle refusée ?
7. Le remboursement : décaissement simple, ou API dédiée ?
8. Les frais par opérateur, les minimums et maximums, le délai de versement, une API de solde.
9. La réponse de `payin` : immédiate (`SUCCESS`) ou `PENDING` puis notification ?

## 2. Où le paiement intervient aujourd'hui

Tout passe par **Fapshi**, avec deux comptes : encaissement et décaissement.

| # | Flux | Acteur | Aujourd'hui | Code |
|---|---|---|---|---|
| E1 | **Payer une commande marketplace** (acompte ou paiement complet) | Client connecté, site et appli | Fapshi : page hébergée (`initiate-pay`) ou demande sur le téléphone (`direct-pay`) | `paiements/fapshi.*`, `MarketplacePayment.tsx`, `mobilekati/app/checkout.tsx`, `payment/[reference].tsx` |
| E2 | **Payer une commande sans compte** | Client invité | Fapshi, routes `sans-compte` | `fapshi.controller.ts` |
| E3 | **Payer un versement en plusieurs fois** | Client | Fapshi `direct-pay` | `paiements/fapshi` (`echelonnement/direct`), `PaiementVersement.tsx` |
| E4 | **Payer à la livraison en mobile money** | Client, avec le livreur | Le livreur encaisse et déclare ; pas de PSP | livraisons, caisse |
| E5 | **Payer au comptoir** | Comptoir | Espèces ou mobile money déclaré ; pas de PSP | `caisse` |
| D1 | **Verser son solde à un vendeur** (retrait) | Vendeur demande, direction approuve | Décaissement Fapshi | `finance-vendeur.service.ts`, `ReversementVendeurPsp` |
| D2 | **Rembourser un retour** (litige) | Direction | Décaissement Fapshi vers le numéro du paiement | `fapshi-remboursements.*`, `RemboursementPsp` |
| D3 | **Rendre l'acompte d'une ligne refusée** | Direction | Décaissement Fapshi | `refus-ligne.service.ts` |
| D4 | **Rembourser un paiement en plusieurs fois** (abandon, défaillance) | Direction | Référence saisie à la main | `plans-echelonnement.service.ts` |
| S1 | **Notifications de paiement** (rappels) | Système | Webhook Fapshi, secret partagé | `fapshi.controller.ts` (`rappel`), `fapshi-remboursements.controller.ts` (`rappel`) |
| S2 | **Commandes impayées** : expiration, paiements « en vol » | Système | Tâche qui lit `paiements_fapshi` | `commandes-impayees.service.ts` |
| S3 | **Registre financier** (écritures, commissions, soldes vendeurs) | Système | Écritures double partie, indépendantes de la passerelle | `TransactionFinanciere`, `registre-financier` |
| S4 | **Parrainage KATI** : contrôle anti-fraude par numéro de paiement | Système | Lit `paiements_fapshi.numero` | `parrainage-kati.service.ts` |

**Le bon point de départ** : le registre financier, les commissions, les soldes vendeurs et la machine d'états des commandes ne dépendent pas de Fapshi. Seule la couche « passerelle » est à remplacer.

## 3. Principe de la mise en place

1. **Une couche « passerelle » commune, Fapshi et Kratospay derrière.**
   - Une interface unique : encaisser, décaisser, lire un statut, vérifier une notification.
   - Deux adaptateurs : `FapshiPasserelle` (l'existant, déplacé) et `KratospayPasserelle`.
   - Le reste du code (commandes, échelonnement, litiges, finance) ne parle plus que de la passerelle.
2. **Basculer flux par flux, sans tout casser.**
   - Un réglage de la direction choisit la passerelle par flux (encaissement, décaissement), avec Fapshi en secours.
   - On peut ouvrir Kratospay d'abord aux encaissements, garder Fapshi pour les décaissements, puis basculer.
3. **Des tables communes, plus des tables Fapshi.**
   - `paiements_psp` remplace `paiements_fapshi` : passerelle, référence, identifiant de la passerelle, statut, montant, opérateur, numéro, charge utile brute.
   - Les décaissements (`RemboursementPsp`, `ReversementVendeurPsp`) gagnent une colonne `passerelle`.
   - Une migration recopie l'historique Fapshi, qui reste lisible.
4. **Ne jamais croire la seule réponse immédiate.**
   - Un encaissement n'est confirmé que par une notification signée **ou** par une consultation du statut côté Kratos.
   - Une tâche reprend les transactions restées `PENDING` (consultation toutes les minutes, puis de plus en plus espacée).
   - Un décaissement à l'issue incertaine reste « indéterminé », et toute nouvelle tentative est bloquée tant qu'il n'est pas rapproché. Le code Fapshi le fait déjà ; il est à garder.
5. **Idempotence partout.**
   - La `reference` envoyée à Kratos est notre identifiant unique : commande, versement, remboursement ou retrait, plus un numéro de tentative.
   - Une notification rejouée ne peut pas encaisser deux fois (contrainte d'unicité, comme aujourd'hui).
6. **Sécurité.**
   - La clé Kratospay reste au backend, jamais dans le site ni dans l'appli.
   - Les notifications sont vérifiées (signature, ou à défaut consultation du statut avant de croire leur contenu).
   - Chaque décaissement passe par la direction et va au journal, comme aujourd'hui.
7. **Montants et opérateurs.**
   - Le choix d'opérateur (Orange, MTN) se fait par la saisie du client, ou se déduit du préfixe du numéro.
   - Les minimums sont affichés avant le paiement.

## 4. Ce que chaque acteur voit et fait

**Client (site, appli mobile, sans compte)**
- **Paiement d'une commande** : il choisit Orange Money ou MTN MoMo, saisit son numéro et valide. Il reçoit la demande sur son téléphone, confirme avec son code, et l'écran suit l'état (« en attente de votre validation », « payé », « échoué, réessayer »).
- **Versement d'un paiement en plusieurs fois** : même parcours, depuis le suivi de son plan.
- **Remboursement** : un e-mail l'informe que l'argent part vers son numéro, puis qu'il est arrivé.
- **Appli mobile** : même parcours, sans navigateur externe, puisque Kratospay ne propose pas de page hébergée.

**Vendeur (espace vendeur)**
- Il voit son solde disponible et ses retraits. Il demande un retrait vers son numéro mobile money.
- Il suit son retrait : demandé, approuvé, envoyé, reçu ou échoué.
- Il ne touche jamais à la passerelle.

**Direction (panel)**
- **Réglages de la passerelle** : par flux, la passerelle active et la passerelle de secours ; test de connexion ; état des clés (sans jamais les afficher).
- **Approbation des retraits vendeurs et des remboursements** ; la passerelle utilisée est celle du réglage.
- **Rapprochement** : liste des transactions en attente ou indéterminées, consultation du statut chez Kratos en un clic, rapprochement manuel avec la preuve.
- **Tableau de trésorerie** : encaissé, décaissé, frais par passerelle et par opérateur, écarts, et solde si Kratos l'expose.

**Comptoir et livreur**
- Option à décider : déclencher depuis le panel ou l'application livreur une demande de paiement sur le téléphone du client (au comptoir, ou à la porte pour le reste à payer). L'encaissement est alors confirmé par Kratos, et non plus seulement déclaré, ce qui supprime de l'argent mobile non rapproché.

**Point focal KATI**
- Aucun accès à l'argent, comme convenu. Il voit seulement qu'une commande est payée ou non.

**Système**
- Notifications Kratospay vérifiées et sans doublon.
- Reprise des transactions en attente.
- Expiration des commandes impayées.
- Écritures du registre financier à chaque encaissement et décaissement.
- Alertes à la direction : passerelle indisponible, taux d'échec anormal, transaction indéterminée depuis plus d'une heure.

## 5. Découpage en lots

0. **Réponses de Kratos** : webhooks, statut, bac à sable, sécurité du décaissement. Sans elles, seuls les lots 1 et 2 peuvent avancer.
1. **Couche passerelle** : interface commune, Fapshi déplacé derrière, tables `paiements_psp` et colonne `passerelle`, migration de l'historique. Aucun changement visible ; les tests de Fapshi doivent rester verts.
2. **Adaptateur Kratospay** : encaissement, décaissement, statut, erreurs, configuration (`KRATOSPAY_BASE`, `KRATOSPAY_PUBLIC_KEY`, secret de notification). Tests contre un faux serveur Kratos.
3. **Notifications et reprise** : route de notification, vérification, sans doublon ; tâche de reprise des `PENDING` ; alertes.
4. **Encaissements clients** : commande (connecté et sans compte), versements en plusieurs fois ; écrans de paiement du site et de l'appli (choix de l'opérateur, numéro, suivi de l'état).
5. **Décaissements** : retraits vendeurs, remboursements de retours et de lignes refusées, remboursement d'un paiement en plusieurs fois par la passerelle.
6. **Panel de la direction** : réglages par flux, rapprochement, trésorerie.
7. **Option comptoir et livreur** : demande de paiement sur le téléphone du client, confirmée par Kratos.
8. **Recette** : bac à sable de bout en bout, puis petits montants réels en production avant d'ouvrir à tous ; compte rendu.

## 6. Décisions (28 octobre 2026)

| Sujet | Décision |
|---|---|
| Fapshi | **Remplacé complètement** par Kratospay. Pas de passerelle de secours. |
| Bascule | **Tout en même temps** : encaissements et décaissements. |
| Comptoir et livreur | **Oui** : la demande de paiement part sur le téléphone du client et c'est Kratos qui confirme. |
| Carte bancaire | **À prévoir**. Kratos ne la documente pas encore : le branchement se fera dès qu'il la documente. |
| Frais de passerelle | **Pris en charge par KatiMarket** : le client paie le montant affiché, le vendeur reçoit son solde entier. |
| Compte Kratospay | Existant ; clés fournies en dernier. |

## 7. Architecture retenue

- **Un client HTTP Kratospay** (`src/paiements/kratospay/`) : encaisser, décaisser, consulter un statut, vérifier une notification, certifier la configuration. Il normalise toute réponse (`SUCCESS`, `PENDING`, `FAILED`) et distingue une erreur réseau, dont l'issue est **indéterminée**, d'un refus franc.
- **Ce qui n'est pas documenté est paramétrable**, pour s'adapter aux réponses de Kratos sans redéployer de code :
  - adresse de l'API ;
  - chemin de consultation du statut ;
  - en-tête et secret de signature des notifications ;
  - codes opérateurs (`orange_money_cm`, `mtn_momo_cm`).
- **Trois sources de confirmation, dans cet ordre** : la réponse immédiate de Kratos à notre appel, la notification signée, la consultation du statut. Tant qu'aucune ne dit `SUCCESS`, rien n'est encaissé.
- **Une `reference` unique par tentative** :
  - encaissement : générée à chaque essai, pour qu'un client puisse réessayer ;
  - décaissement : la `referenceInterne` déjà unique des remboursements et retraits.

  Elle sert de clé chez Kratos et chez nous.
- **Tables** :
  - `paiements_fapshi` devient `paiements_passerelle`, avec une colonne `passerelle` (historique Fapshi conservé) ;
  - les tables de décaissement gagnent la même colonne.
- **Une seule adresse de notification** pour les encaissements et les décaissements ; elle retrouve l'opération par sa référence.
- **Une tâche de reprise** des transactions restées `PENDING`, dès que Kratos documente la consultation du statut.
- **Opérateur** : choisi par le client, sinon déduit du préfixe du numéro camerounais.
- **Site et appli** : le parcours actuel (demande sur le téléphone, puis suivi de la commande) est gardé ; seules les adresses appelées changent.

## 8. Lots de réalisation

1. **Client Kratospay et configuration** ; tests contre un faux serveur.
2. **Tables** : `paiements_passerelle` et colonne `passerelle` ; migration avec retour arrière.
3. **Encaissements** : commandes (connecté, sans compte, comptoir), versements en plusieurs fois, notification, reprise ; Fapshi retiré.
4. **Décaissements** : retraits vendeurs, remboursements de retours, lignes refusées, paiements en plusieurs fois.
5. **Livreur** : demande de paiement du reste dû à la porte, confirmée par Kratos.
6. **Site, appli et panel** : adresses, opérateurs, écran de configuration et de rapprochement de la direction.
7. **Recette et compte rendu** ; la recette réelle se fera avec vos clés.
