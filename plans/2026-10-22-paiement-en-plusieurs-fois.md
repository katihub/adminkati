# Paiement en plusieurs fois (achat livré une fois soldé)

Statut : validé le 22 octobre 2026 et réalisé (lots 1 à 5) le même jour ; compte rendu dans `walkthroughs/2026-10-22-paiement-en-plusieurs-fois.md`.

## Le besoin

Un client choisit un produit et le paie petit à petit, sur une durée fixée (par exemple 6 mois), en versant le montant qu'il veut dans les limites fixées. Quand le prix des produits est entièrement payé, il choisit sa livraison, paie les frais de livraison, et la commande part comme une commande ordinaire (boutique ou Kati Express). Ce n'est pas un crédit : rien n'est livré avant le paiement complet.

## Décisions déjà prises

| Sujet | Décision |
|---|---|
| Prix | Figé à l'ouverture du plan, même si la boutique change son prix ensuite. |
| Stock | Réservé quand le client a versé au moins un pourcentage du prix (50 % par défaut, réglable par catégorie). Chaque boutique choisit, offre par offre, si elle accepte ce mode. |
| Abandon | Si le client arrête de payer ou dépasse l'échéance : pas de remboursement. Condition affichée et acceptée explicitement à l'ouverture, et inscrite dans les CGV. |
| Défaillance de la boutique ou de KatiMarket | Remboursement intégral (rupture après réservation, offre retirée, boutique suspendue). |
| Argent | Encaissé et gardé par KatiMarket jusqu'à la livraison, puis reversé à la boutique par le circuit actuel. |
| Frais de livraison | Payés à la fin, au moment de choisir la livraison. |
| Compte | Compte client obligatoire, rappels automatiques par e-mail (et notification push si l'appli est installée). |
| Espace client | Une rubrique « Mes paiements en plusieurs fois » pour suivre et continuer les versements. |

## Ce qui ne change pas

L'acompte et le paiement complet restent tels quels. Le nouveau mode s'ajoute à côté, avec ses propres tables et routes. Une fois soldé, le plan devient une commande ordinaire déjà payée : préparation, livraison, caisse, litiges et reversement à la boutique fonctionnent sans modification (une sous-commande entièrement prépayée a déjà une créance nulle dans `acquerirUneCommission`).

## Règles par catégorie (réglées par l'admin)

Fixées sur une catégorie principale, héritées par ses sous-catégories :

- activé ou non ;
- durée maximale (en jours ou mois) ;
- premier versement minimum (% du prix) ;
- versement minimum (FCFA) ;
- seuil de réservation du stock (50 % par défaut) ;
- prix minimum du produit pour être éligible ;
- type de versements : **libres** (le client verse ce qu'il veut, au-dessus du minimum) ou **tranches fixes** (nombre de mensualités égales imposé) ;
- délai d'inactivité maximal sans versement avant rappel renforcé.

Un interrupteur général permet de désactiver le mode partout (utile tant que le cadre juridique n'est pas validé).

## Parcours client

1. **Fiche produit** : bouton « Payer en plusieurs fois » si l'offre l'accepte, que la catégorie l'autorise et que le prix dépasse le minimum. Il affiche par exemple « dès 29 500 FCFA aujourd'hui, jusqu'à 6 mois ».
2. **Ouverture du plan** (compte obligatoire) : récapitulatif (prix figé, durée, minimums, seuil de réservation), choix de la durée et du premier versement, case à cocher obligatoire « Je comprends qu'en cas d'abandon ou de dépassement de l'échéance, les sommes versées ne sont pas remboursées », puis paiement mobile du premier versement.
3. **Espace « Mes paiements en plusieurs fois »** (`/compte/paiements-plusieurs-fois`) : chaque plan avec sa barre de progression (versé / prix), le reste à payer, l'échéance et le temps restant, l'état du stock (« réservé pour vous » dès le seuil), l'historique des versements, et un bouton **« Verser »** (montant libre au-dessus du minimum, ou la tranche suivante).
4. **Plan soldé** : le client choisit son mode de livraison et son adresse comme au panier, paie les frais (rien pour le retrait en boutique), et la commande est créée et confirmée automatiquement. Elle apparaît ensuite dans « Mes commandes ».

## Côté boutique

- Par offre, une case « Accepte le paiement en plusieurs fois » (sans repasser par la modération : ce n'est ni un prix ni une condition de vente).
- Une liste en lecture seule des plans en cours sur ses offres, avec le stock réservé.

## Côté KatiMarket (panel)

- Opérations → « Paiement en plusieurs fois » : règles par catégorie, interrupteur général, liste des plans (filtres par état et boutique).
- Action « Annuler pour défaillance de la boutique » qui déclenche le remboursement intégral.

## Données (nouvelles tables, aucun champ existant modifié)

- `regles_echelonnement_categorie` : les règles ci-dessus, une ligne par catégorie principale.
- `offres.accepte_echelonnement` : nouveau booléen, faux par défaut.
- `plans_echelonnement` : client, offre, boutique, quantité, prix figé, total produits, règles figées à l'ouverture, échéance, montant versé, état, réservation de stock, commande créée à la fin.
- `versements_echelonnement` : montant, état (en attente, reçu, échoué), lien avec le paiement mobile.
- `paiements_fapshi` : nouvelle colonne facultative vers le versement. Le paiement des commandes n'est pas modifié.
- `reservations_stock_offre` : nouvelle colonne facultative vers le plan (réservation longue, jusqu'à l'échéance).

**États d'un plan** : ouvert → réservé (seuil atteint) → soldé (prix payé) → converti (commande créée). Sorties : expiré (échéance dépassée, non remboursé), abandonné (le client y renonce, non remboursé), annulé pour défaillance (remboursé intégralement).

## Argent et comptabilité

- Chaque versement : débit « encaissé plateforme », crédit d'un nouveau compte « avances en plusieurs fois des clients ».
- À la conversion en commande : ces avances sont transférées vers « acompte client », exactement comme un paiement complet ; le reversement à la boutique suit ensuite le circuit actuel.
- Abandon ou expiration : les avances quittent le compte client vers un compte de produit, à définir (voir question 1).
- Défaillance : remboursement par le circuit de remboursement mobile existant.

## Tâches automatiques (même mécanisme que les tâches actuelles)

Une passe quotidienne :

- rappels : J-30, J-7 et J-1 avant l'échéance, et après la durée d'inactivité fixée ;
- expiration des plans dont l'échéance est dépassée (stock libéré, e-mail au client) ;
- contrôle des réservations des plans (offre retirée, boutique suspendue : alerte à l'équipe).

## E-mails

Plan ouvert, versement reçu (avec la progression), stock réservé, rappel d'échéance, plan soldé (choisir la livraison), plan expiré, remboursement pour défaillance. Côté boutique : stock réservé par un plan, plan converti en commande.

## Garde-fous

- Nombre maximal de plans ouverts par client (3 par défaut).
- Versement refusé s'il dépasse le reste à payer.
- Prix et règles figés au moment de l'ouverture.
- Mode désactivable globalement et par catégorie sans toucher aux plans déjà ouverts.

## Découpage en lots

1. Données, règles par catégorie (panel), case par offre (boutique), interrupteur général.
2. Ouverture du plan et versements par paiement mobile, comptabilité, e-mails.
3. Réservation du stock au seuil, tâche quotidienne (rappels, expiration).
4. Plan soldé : choix de la livraison, paiement des frais, création de la commande.
5. Interfaces : bouton fiche produit, espace client, liste boutique, onglet panel.
6. Tests automatiques, recette complète en navigateur, plan et compte rendu.

## Réponses du 22 octobre 2026

1. **Argent d'un plan abandonné ou expiré** : il revient à KatiMarket (compte de produit dédié).
2. **Points KATI** : gagnés normalement, comme pour un achat ordinaire, quand le plan devient une commande.
3. **Abandon volontaire** : possible depuis l'espace client, après un avertissement explicite qu'il n'y aura pas de remboursement.
4. **Valeurs par défaut** : premier versement 10 %, versement minimum 5 000 FCFA, réservation à 50 %, 3 plans ouverts maximum par client. Validées.

## Point juridique

La conservation de fonds de clients sur plusieurs mois et la clause de non-remboursement en cas d'abandon sont à faire valider par le juriste (Porte 1, cadre de la phase 0). L'interrupteur général permet de construire et tester le mode, puis de ne l'ouvrir qu'après validation.
