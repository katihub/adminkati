# Plan : notifications dans l'interface (client, vendeur, équipe)

## Besoin

Chaque personne doit voir ce qui la concerne sans attendre un e-mail : une **cloche avec un compteur** dans l'en-tête, une liste des dernières notifications, et une page d'historique.

- **Client** : sur le site et dans l'application mobile.
- **Vendeur** : dans son espace vendeur.
- **Équipe** : dans le panel.

Les e-mails restent tels quels. Les notifications dans l'interface s'ajoutent à côté.

Ordre convenu : le vendeur et le panel d'abord, puis le client.

## Backend

1. **Tables**, migration `20261105100000_notifications_app` :
   - `notifications_app` : l'espace (`client`, `vendeur`, `equipe`), le client ou la boutique visés, les rôles visés, le titre, le texte et le lien ;
   - `lectures_notifications_app` : qui a lu quoi ;
   - `curseurs_notifications_app` : « tout marquer comme lu », par personne et par boîte.
2. **Écrites avec le fait**, dans sa transaction, comme la file des e-mails. Une clé unique rend le rejeu inoffensif.
3. **Qui voit quoi** :
   - le client voit les siennes ;
   - un membre de boutique voit celles de sa boutique, filtrées par ses rôles s'il y en a ;
   - l'équipe voit ce que ses rôles concernent. Chaque notification nomme ses rôles, la direction comprise. Un point focal ne voit que ses boutiques.
4. **Routes** `notifications-app/client`, `notifications-app/boutiques/:id` et `notifications-app/equipe`. Pour chacune : liste paginée, compteur, « lue » et « tout lu ».
5. **Événements** :
   - **client** :
     - commande confirmée ou paiement reçu ;
     - en préparation (un livreur est désigné), expédiée (le colis est récupéré), en route, livrée ;
     - paiement à la porte ;
     - article indisponible ;
     - devis confirmé, refusé ou bientôt expiré ;
     - réponse dans un litige, retour accepté ou refusé, arbitrage, remboursement ;
     - paiement en plusieurs fois ;
     - KATI disponibles ou bientôt expirés.
   - **vendeur** :
     - nouvelle commande ;
     - demande de devis et relance ;
     - litige, message du client, retour en route, arbitrage ;
     - message de l'équipe ;
     - produit ou offre approuvé, refusé ou à corriger ;
     - retrait approuvé, refusé ou versé ;
     - contrat changé ;
     - stock réservé et plan devenu commande.
   - **équipe** :
     - nouvelle commande (la direction, une fois par commande ; le point focal, par boutique) ;
     - message d'un vendeur, y compris par Kati ;
     - nouvelle boutique à valider ;
     - produit ou offre à valider ;
     - litige à arbitrer ;
     - demande de retrait ;
     - demande Kati.

## Panel

- `AdminNotificationBell` dans l'en-tête :
  - compteur vérifié toutes les 30 secondes et au retour sur l'onglet ;
  - les 8 dernières notifications, « Tout marquer comme lu » et « Voir toutes les notifications ».
- Page `/notifications` (`/fr/notifications`), ouverte à toute l'équipe : l'historique, page par page.
- Ouvrir une notification la marque comme lue et mène à l'écran concerné.

## Site et application

- **Site, espace vendeur** : une cloche dans l'en-tête de l'espace. Le lien `/espace-vendeur?rubrique=…` ouvre la bonne rubrique.
- **Site, client** : une cloche dans l'en-tête du site, et une page `/compte/notifications`.
- **Application** : une cloche sur l'accueil et un écran « Mes notifications ». Les liens du site sont traduits vers les écrans de l'application.
