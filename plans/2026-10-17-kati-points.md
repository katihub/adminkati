# Administration des points KATI

## Objectif

Lot K4 du plan maître `../plans/2026-10-17-module-kati.md` : la direction administre le programme KATI depuis le panel. Elle peut :

- voir ce qu'il détient et ce qu'il coûte ;
- consulter le solde et l'historique de chaque client ;
- créditer ou retirer des KATI avec un motif ;
- trancher les commissions en revue et révoquer un parrainage ;
- régler la politique (taux, conversion, durées, plafonds) par versions approuvées.

## Contrat backend

Toutes les routes sont réservées à la direction et commencent par `/v1/marketplace/kati`.

- `GET administration/indicateurs` : les KATI par poche, leur valeur en FCFA, ce qui a été émis ce mois et son coût, les commissions en revue, les parrainages actifs.
- `GET administration/clients?recherche=` : les clients et leurs soldes (50 au plus).
- `GET administration/clients/:id` : soldes, historique signé, parrain, filleuls, code.
- `POST administration/clients/:id/ajustements` : `{ sens: credit | retrait, points, motif, cle }`.
  - La `cle` est un UUID tiré à l'ouverture du formulaire, ce qui rend la saisie idempotente.
  - Un retrait ne dépasse pas le disponible.
- `GET administration/parrainages?filtre=en_revue|tous`.
- `POST administration/commissions/:id/validation` et `POST administration/commissions/:id/annulation` (`{ motif }`).
- `POST parrainages/:id/revocation` (`{ motif }`).
- `GET politiques`, `POST politiques` (`{ regles }`, brouillon), `POST politiques/:id/approbation`.
- `POST traitements` : lance tout de suite l'attribution, la reprise et la libération.

## Phases

1. **Données** : `app/types/api/kati.ts`, `app/composables/useKati.ts`, clés `kati` dans `app/utils/api-query-keys.ts`.
2. **Écrans** :
   - l'onglet direction « Points KATI » (`kati-points`), sous-composants de `app/components/operations/kati/` ;
   - `KatiWorkspace` (sections), `KatiOverview`, `KatiClients` (recherche, fiche, ajustement), `KatiSponsorships`, `KatiPolicy` (taux saisis en %, stockés en points de base) ;
   - les traductions `operations.kati.*` en fr et en.
3. **Tests** : `test/nuxt/kati-workspace.test.ts`, `test/nuxt/operations-page.test.ts`.
