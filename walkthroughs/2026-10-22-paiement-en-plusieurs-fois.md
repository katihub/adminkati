# Walkthrough — Paiement en plusieurs fois

Plan : `plans/2026-10-22-paiement-en-plusieurs-fois.md`. Lots 1 à 5 réalisés ; l'acompte et le paiement complet n'ont pas changé.

## Résultat

**Panel (Opérations → « Paiement en plusieurs fois », direction seulement)**

- **Interrupteur général** (éteint par défaut) et nombre maximal de plans en cours par client (3).
- **Règles par catégorie principale**, héritées par les sous-catégories : autorisé ou non, durée maximale, premier versement minimum (%), versement minimum, seuil de réservation du stock (%), prix minimum, versements libres ou mensualités fixes (nombre), délai d'inactivité avant rappel. Les valeurs par défaut sont 10 %, 5 000 FCFA, 50 %, 180 jours.
- **Liste des plans** filtrable par état, avec le client (nom, e-mail, téléphone), la progression et l'échéance. Actions disponibles :
  - « Annuler pour défaillance » : un motif est obligatoire ; le stock est libéré et tout le versé devient dû au client ;
  - « Marquer remboursé » : la référence du payout est obligatoire ;
  - « Relancer la création de la commande » : pour un plan payé dont les frais de livraison sont réglés mais dont la commande n'a pas pu être créée.

**Vitrine**

- **Fiche produit** : le bouton « Payer en plusieurs fois » n'apparaît que si l'offre est éligible. Il indique le premier versement minimum et la durée maximale.
- **Ouverture** : prix figé, choix de la durée et du premier versement, et case obligatoire de non-remboursement. Un compte est exigé : sans session, la connexion s'ouvre.
- **Espace client** « Mes paiements en plusieurs fois » :
  - progression, échéance et état du stock (réservé dès le seuil) ;
  - versement par Orange Money ou MTN, suivi jusqu'à la confirmation ;
  - historique des versements ;
  - abandon avec avertissement explicite qu'il n'y a pas de remboursement ;
  - une fois le prix payé : choix de la livraison, frais calculés par le serveur, paiement des frais, puis lien vers la commande créée.
- **Espace vendeur** :
  - case « Accepte le paiement en plusieurs fois » par offre, sans modération ;
  - liste des plans de ses offres, sans l'identité des clients, chargée à l'ouverture de la section.

**Backend**

- **Migration** `20261022210000_paiement_en_plusieurs_fois`, avec `rollback.sql` : uniquement des tables et colonnes nouvelles.
- **Argent** :
  - chaque versement va sur un compte « avances en plusieurs fois des clients » ;
  - à la conversion, ces avances sont affectées, puis la confirmation suit le chemin du paiement complet ;
  - à l'abandon ou à l'expiration, le versé passe en produit KatiMarket ;
  - en cas de défaillance, le versé devient « remboursement dû », soldé quand le remboursement est marqué fait.
- **Fapshi** :
  - nouvelle route `POST /paiements/fapshi/echelonnement/direct` ;
  - le rappel retrouve le versement par la ligne posée à la demande ; le paiement des commandes n'est pas modifié.
- **Commande** : la création de commande est découpée en `planifier()` et `construire()`. Le plan soldé réutilise exactement le même chemin, au prix figé.
- **Passe horaire** :
  - retire un plan sans premier versement après 24 h ;
  - expire les plans échus ;
  - retente la réservation au seuil ;
  - envoie les rappels J-30, J-7, J-1 et d'inactivité.
- **Script** `scripts/passe-echelonnement.ts` pour lancer la passe à la main.
- **E-mails** : ouverture, versement reçu, stock réservé (client et boutique), plan payé, rappels, clôture, commande créée (client et boutique).

## Vérifications

- Backend : 93 tests sur l'échelonnement et Fapshi, 43 sur la création de commande, inchangés après le découpage.
- Recette contre la base locale, rappels Fapshi simulés :
  - règles et accord de l'offre ;
  - ouverture et versements ;
  - un paiement en double n'est pas crédité deux fois ;
  - réservation au seuil ;
  - abandon et registre ;
  - plan payé en un versement, puis estimation de la livraison, frais payés et commande créée et confirmée, payée en entier, **au prix figé malgré un changement de prix de la boutique** ;
  - stock consommé ;
  - avances soldées ;
  - défaillance, remboursement, et refus d'un second remboursement.
- Passe horaire réelle sur trois plans : retrait (sans versement depuis 2 jours), rappel J-7, expiration avec e-mail.
- Panel : `installment-plans-workspace.test.ts` (5 tests) et `operations-page.test.ts` (onglet ajouté) au vert ; oxlint, i18n:check et typecheck sans nouvelle erreur.
- Vitrine :
  - `e2e/paiement-plusieurs-fois.spec.ts` (bureau et mobile) : ouverture, paiement suivi jusqu'à confirmation, bornes, abandon, livraison, frais, commande ;
  - vraie fiche produit sur le backend local : bouton affiché, formulaire d'ouverture, aucune erreur JavaScript.

## Écarts au plan

- **Réservation du stock** : faite directement sur `stocks_offre.quantite_reservee`, avec un mouvement de stock. Il n'y a pas de colonne vers le plan dans `reservations_stock_offre` : cette table exige une ligne de commande, que le plan n'a pas encore.
- **Défaillance** : la dette est inscrite au registre et l'équipe confirme le remboursement après l'avoir fait (payout Fapshi ou autre). Le payout automatique demanderait une liaison au circuit des retours et refus ; il reste à faire si besoin.
- **Ordre des lots** : la réservation au seuil et l'abandon sont arrivés dès le lot 2, puisqu'ils vivent dans la même transaction que le versement.

## Limites

- Le mode reste **éteint** tant que la direction ne l'allume pas. La clause de non-remboursement est à valider par le juriste avant ouverture.
- Les versements « libres » acceptent n'importe quel montant entre le minimum et le reste. Il n'y a pas d'échéancier imposé, sauf en mensualités fixes.
- Les textes de l'espace client et de l'ouverture sont en français seulement.
