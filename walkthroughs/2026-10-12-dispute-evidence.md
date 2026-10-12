## What I built

Les justificatifs de litige sont stockés dans un bucket privé et ne sont accessibles qu'à travers une route authentifiée qui revalide le droit au dossier et l'empreinte SHA-256. L'espace client permet de joindre et télécharger ses preuves; le super-admin voit et télécharge les pièces depuis le dossier opérationnel.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Bucket privé et contrainte anti-doublon | Done | `../BackendKati/prisma/migrations/20261012120000_pieces_litiges_privees`, `../BackendKati/sql/stockage.sql` |
| Validation et lecture sécurisées | Done | `../BackendKati/src/marketplace/litiges/litiges.service.ts`, `../BackendKati/src/stockage/stockage.service.ts` |
| Upload et téléchargement client | Done | `../websitekati/src/app/marketplace/commande/[reference]/suivi/SuiviMarketplace.tsx` |
| Consultation super-admin | Done | `app/components/operations/MarketplaceDisputesWorkspace.vue` |

## Deviations

L'upload est rattaché à un message existant et seulement à son auteur. Cela empêche une pièce ajoutée après coup de prendre l'identité d'un autre intervenant. Les pièces sont téléchargées en `attachment` plutôt qu'affichées inline.

## Tests

- Backend ciblé : 4 suites et 17 tests réussis, dont MIME usurpé, nom hostile, message interne, stockage local privé et absence d'URL publique.
- `npm.cmd run build` backend : réussi.
- Migration appliquée sur `katihub_recette` : 49 migrations, schéma à jour.
- Vitrine : `npm.cmd run typecheck`, `npm.cmd run lint` et `npm.cmd run build` réussis (39 pages générées; avertissement attendu lorsque l'API locale d'images est arrêtée).
- Admin : `pnpm.cmd typecheck` et `pnpm.cmd i18n:check` réussis; lint réussi avec deux avertissements préexistants hors périmètre lors de la passe précédente.

## Not done

Le dépôt ne dispose pas d'un moteur antivirus ou CDR. Les protections livrées sont une liste fermée de formats, la vérification des signatures binaires, les plafonds, le stockage privé, l'autorisation à chaque lecture, le téléchargement forcé et le contrôle d'intégrité. Un scanner antivirus peut être ajouté ultérieurement sans rendre les objets publics.

## Notes for the reviewer

Le bucket `litiges` doit aussi être créé par la migration sur l'instance Supabase; `sql/stockage.sql` garde la déclaration reproductible. En local, `/fichiers/litiges` répond volontairement 404 et seule la route métier lit le fichier.
