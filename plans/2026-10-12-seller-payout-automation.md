# Reversements vendeurs reels

## Objectif

Remplacer la confirmation manuelle d'un reversement vendeur par un payout Fapshi suivi jusqu'a son issue, avec preuve privee, rapprochement et reprise sure. Un retrait ne quitte le compte vendeur gele qu'apres confirmation `SUCCESSFUL` du PSP.

## Reutilisation

- Le client payout, la verification de webhook et la classification des erreurs de `BackendKati/src/marketplace/litiges/fapshi-remboursements.service.ts`.
- Le registre en double entree de `BackendKati/src/marketplace/finance/registre-financier.service.ts`.
- Le stockage prive et les controles MIME/taille de `BackendKati/src/stockage/stockage.service.ts`.
- Les requetes et mutations TanStack Query de `adminkati/app/composables/useMarketplaceOperations.ts`.
- Les composants d'etat et controles existants de `adminkati/app/components/operations/SellerFinanceWorkspace.vue`.

## Contrats de donnees

- Ajouter une operation PSP 1:1 au retrait, avec reference interne, `transId`, telephone, statut (`prepare`, `soumis`, `reussi`, `echec`, `verification_requise`), tentatives, charge utile et horodatages.
- `POST /v1/marketplace/finance/retraits/:id/reversement` initie le payout avec un numero camerounais et ne marque plus le retrait comme reverse.
- `POST /v1/marketplace/finance/retraits/:id/rapprocher` relit `GET /payment-status/:transId`.
- `POST /v1/marketplace/finance/retraits/fapshi/rappel` traite le webhook authentifie et idempotent.
- `POST /v1/marketplace/finance/retraits/:id/preuve` accepte un multipart prive et calcule lui-meme SHA-256, MIME et taille.
- `GET /v1/marketplace/finance/retraits/:id/preuve` restitue la preuve aux seuls membres de la direction.

## Phases

### 1. Persistance et machine d'etat

- **Quoi :** ajouter le modele Prisma de reversement PSP et les contraintes qui interdisent une sortie comptable avant confirmation.
- **Ou :** `BackendKati/prisma/schema.prisma`, nouvelle migration sous `BackendKati/prisma/migrations/`.
- **Fini quand :** Prisma genere le client et les tests couvrent succes, doublon, echec explicite et etat indetermine.

### 2. Execution, webhook et rapprochement

- **Quoi :** generaliser le client payout Fapshi, initier le transfert, appliquer les statuts et finaliser atomiquement le registre.
- **Ou :** `BackendKati/src/marketplace/finance/`, `BackendKati/src/marketplace/litiges/`, `BackendKati/src/marketplace/marketplace.module.ts`.
- **Fini quand :** une reponse `SUCCESSFUL` unique cree une seule transaction de reversement; un webhook duplique est neutre; un echec de reseau devient `verification_requise`.

### 3. Preuve serveur

- **Quoi :** remplacer la saisie de cle et SHA par un upload prive dont le serveur calcule les metadonnees; autoriser la lecture controlee.
- **Ou :** `BackendKati/src/marketplace/finance/finance-vendeur.controller.ts`, `finance-vendeur.service.ts`, `BackendKati/src/stockage/stockage.service.ts`.
- **Fini quand :** seuls PDF/JPEG/PNG valides sous 10 Mio sont acceptes et aucune cle de stockage n'est fournie par le navigateur.

### 4. Interface d'exploitation

- **Quoi :** remplacer le formulaire manuel par numero + lancement, afficher l'etat PSP, offrir rapprochement/reprise apres echec et upload de preuve apres succes.
- **Ou :** `adminkati/app/components/operations/SellerFinanceWorkspace.vue`, `adminkati/app/composables/useMarketplaceOperations.ts`, `adminkati/app/types/api/marketplace-operations.ts`.
- **Fini quand :** chaque etat a une action explicite, les chargements/erreurs sont visibles et aucune saisie SHA/cle n'existe encore.

## Tests

- Tests unitaires backend de la machine d'etat et de l'idempotence, car une double sortie d'argent est le risque principal.
- Tests DTO sur les numeros et fichiers recus a la frontiere.
- Test composant admin sur les actions visibles par statut et l'upload, car une action presente au mauvais moment contournerait la machine d'etat.
- Build, typecheck, lint et controle visuel desktop/mobile.

## Risques

- Fapshi peut accepter un POST sans rendre sa reponse : aucune relance n'est alors autorisee sans `transId`; l'operation passe en verification manuelle.
- Le webhook payout est partage avec les remboursements : la reference externe doit router sans ambiguite vers le bon domaine.
- Une preuve generee par Fapshi n'est pas exposee par le contrat actuel; la preuve televersee reste un justificatif d'exploitation et n'autorise jamais la comptabilisation.

## Hypotheses retenues

- Le service payout Fapshi deja configure sert aussi aux reversements vendeurs; les references internes distinguent retraits et remboursements.
- Les vendeurs sont payes sur Mobile Money pour ce premier connecteur. Une destination bancaire demandera un second connecteur et un contrat structure distinct.
- Les secrets live et l'activation Fapshi restent une operation de production externe et ne seront ni inventes ni marques comme certifies localement.
