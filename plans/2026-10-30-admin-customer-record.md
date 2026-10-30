# Plan — Fiche client consolidée

Conserver profil/adresses/commandes et ajouter les onglets KATI et assistance/remboursements. Lire les KATI avec le contrat existant, réservé à la direction.

Ajouter `GET /clients/:id/activite` réservé direction/comptoir : lectures filtrées par clientId des tickets assistant et marketplace, avec retour/remboursement, compteurs et limite explicite. Journaliser la consultation et ne jamais rendre de conversations non demandées ou de clés de stockage. Définir les types frontend et une query indépendante par client, montée seulement à l'ouverture de l'onglet.

Moderniser le cadre et les filtres sur mobile. Tests backend : refus des autres rôles avant accès DB, filtre client et limite ; tests frontend : onglets par droit, absence de mélange de clients, liens, erreurs et états vides.

Terminé quand chaque rubrique autorisée affiche ses données réelles et ouvre le dossier source correspondant.
