# Plan : voir le téléphone des vendeurs dans le panel

## Besoin

À l'inscription, le vendeur donne un numéro mobile. Ce numéro est enregistré sur sa fiche de membre propriétaire (`membre_boutique.telephone`), mais l'équipe ne peut pas le voir : la fiche vendeur du panel n'affiche que le nom et l'e-mail des membres.

## Changements

1. **Backend** : la lecture d'un vendeur (`GET /vendeurs/:id`) renvoie aussi le `telephone` des membres.
   - Cette route est réservée à la direction et aux points focaux, ces derniers limités à leurs boutiques.
   - La réponse de l'inscription publique ne change pas.
2. **Panel** : dans « Membres de la boutique », sous la fiche du vendeur :
   - le téléphone est cliquable (`tel:`), l'e-mail aussi (`mailto:`) ;
   - « Téléphone non renseigné » s'affiche quand le numéro manque.
3. **Tests** :
   - backend : la lecture demande bien le téléphone des membres ;
   - panel : lien d'appel, lien d'e-mail et cas sans numéro.

## Hors périmètre

Le logo, la bannière et le téléphone public de la boutique sont déjà affichés (voir le plan du 31/10 sur le logo et la bannière).
