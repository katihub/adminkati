# Arbitrages et espaces litiges marketplace

## Objectif

Terminer le cycle de litige de bout en bout pour l'administration, le vendeur et le client, avec des transitions serveur cohérentes et des actions réellement raccordées.

## Contrat fonctionnel

- Le vendeur peut lister les dossiers de sa boutique, lire les échanges externes, répondre avec des pièces, décider un retour, réceptionner un colis et contester uniquement une autorisation défavorable.
- Le client peut répondre avec des pièces, expédier un retour autorisé et contester uniquement un refus.
- La direction peut répondre, décider, réceptionner, arbitrer une contestation et suivre le remboursement PSP.
- Chaque transition métier crée un événement de dossier atomiquement avec la mutation.
- Les messages internes et leurs pièces restent réservés à l'équipe KATIHUB.
- Les capacités renvoyées par l'API pilotent les actions affichées et empêchent les doubles traitements.

## Vérification

- Tests unitaires du cycle et des règles d'accès.
- Build/typecheck backend, marketplace et super-admin.
- Contrôle des états vides, erreurs et actions en cours sur les trois interfaces.
