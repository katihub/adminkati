# Plan — Kati Express : répartition dans le panel et espace livreur

## Demande (30 octobre)

- Un écran de répartition dans le panel pour gérer Kati Express, le service de livraison de la marketplace.
- Un espace livreur dans l'application mobile, bien structuré et détaillé.
- Pour l'attribution : une **suggestion que l'équipe valide**, jamais une attribution automatique.
- Ne modifier aucune fonctionnalité existante.

## Constat

- Le backend sait déjà attribuer (`POST marketplace/expeditions/:id/affectation`) avec ses contrôles :
  - type et vérification de l'agent ;
  - plafond d'espèces ;
  - historique des attributions.
- Il sait aussi faire avancer une livraison : prise en charge prouvée, départ, code envoyé au client, confirmation par code, incidents.
- Il ne sait pas **lister** les expéditions à attribuer, ni dire **à qui** les confier.
- Aucun écran du panel ni de l'application n'utilisait ces routes pour Kati Express.

## Décisions

| Sujet | Décision |
|---|---|
| Fonctionnalités existantes | Aucune route ni règle modifiée. Le backend ne gagne que des lectures, dans de nouveaux fichiers (`marketplace/kati-express`) |
| Attribuer | La route existante, appelée quand un membre de l'équipe clique « Attribuer à … » |
| File « À attribuer » | Planifiée, à attribuer, reportée, échec : tout ce qui attend une décision |
| Suggestion | Le livreur qui a déjà une tournée dans le même quartier, puis la même ville. Ensuite le moins chargé, puis celui qui a le plus de marge sous son plafond d'espèces. Les espèces pas encore remises à la caisse comptent |
| Livreur bloqué | Montré avec la raison (plafond dépassé, aucun plafond fixé), mais sans bouton : l'attribution serait refusée |
| Droits | Panel : direction. Mission : son livreur (ou la direction) |
| Application | Espace livreur visible seulement si le serveur (`GET /moi`) confirme le rôle livreur |
| Preuve de récupération | Photo choisie sur l'appareil (le serveur vérifie le contenu réel), ou référence de l'étiquette, vérifiée à l'écran puis envoyée sous forme d'empreinte |
| Code client | Jamais montré au livreur : il part au client, qui le donne à la remise |

## Fichiers

- **BackendKati** (`cda9be5`) : `livraisons/kati-express-suggestion.ts`, `kati-express.service.ts`, `kati-express.controller.ts`, `kati-express.spec.ts`, enregistrement dans `marketplace.module.ts`.
- **adminkati** :
  - onglet « Kati Express » dans Opérations ;
  - `KatiExpressWorkspace`, `KatiExpressShipmentCard`, `KatiExpressSuggestions`, `KatiExpressCouriers` ;
  - `useKatiExpress` ;
  - traductions `kati-express`.
- **mobilekati** : `lib/livreur-api.ts`, `app/livreur/index.tsx` (mes missions), `app/livreur/[id].tsx` (une mission), entrée dans le compte.
