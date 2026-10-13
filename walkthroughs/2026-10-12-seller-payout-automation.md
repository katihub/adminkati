## What I built

Le reversement vendeur n'est plus une confirmation manuelle. Une demande approuvee cree un payout Fapshi, conserve le solde gele jusqu'a `SUCCESSFUL`, puis ecrit une seule transaction comptable et produit un recu PDF prive avec empreinte SHA-256. Le panel direction lance, rapproche, relance apres rejet explicite et ajoute ou telecharge des justificatifs sans connaitre leur cle de stockage.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Operation PSP persistante et machine d'etat | Done | `../BackendKati/prisma/migrations/20261012150000_reversements_vendeur_psp`, `../BackendKati/src/marketplace/finance/finance-vendeur.service.ts` |
| Confirmation webhook et rapprochement | Done | `../BackendKati/src/marketplace/litiges/fapshi-remboursements.controller.ts`, `../BackendKati/src/marketplace/finance/finance-vendeur.controller.ts` |
| Idempotence, double clic et etat indetermine | Done | Etat CAS `soumission_en_cours`, unicites SQL, cle comptable `reversement-vendeur:<id>` |
| Preuve privee generee et justificatifs ajoutes | Done | `../BackendKati/src/marketplace/finance/finance-vendeur.service.ts` |
| Interface super-admin alignee | Done | `app/components/operations/SellerFinanceWorkspace.vue`, `app/composables/useMarketplaceOperations.ts` |
| Execution live | External — non simulable | Activation payout, secrets live et transfert controle Fapshi restent requis |

## Important design decisions

- Le retrait reste `approuve` pendant `soumis`, `echec` ou `verification_requise`; l'argent reste gele et seul `SUCCESSFUL` pose le debit.
- Un rejet explicite autorise une relance. Une coupure apres POST passe en `verification_requise` et interdit la relance avant rapprochement.
- Le webhook payout existant distribue remboursements et reversements par `externalId`, puis par `transId` si la reference manque. Il n'existe donc pas deux URL concurrentes pour un meme service Fapshi.
- Le recu PSP est genere cote serveur. Les pieces humaines sont append-only, privees, controlees par signature de fichier et reverifiees par SHA-256 a la lecture.

## Verification performed

- Migration appliquee a la base locale `nowtech` sur `localhost:5433`; `prisma migrate status` confirme 50 migrations a jour.
- `prisma validate` : reussi.
- Build Nest : reussi apres la modification finale.
- Tests financiers cibles : 2 suites, 9 tests reussis.
- Typecheck Nuxt : reussi.
- Build Nuxt : client et SSR compiles; la phase finale Nitro est restee active anormalement plus de dix minutes et a ete interrompue. Aucun echec de compilation de ce module n'a ete emis.
- Test Nuxt cible : non collecte a cause du `DataCloneError` de demarrage deja documente pour ce depot.
- Suite Jest globale : 123 suites et 1 904 tests passent; 15 suites historiques echouent principalement sur le lanceur Windows `node_modules/.bin/prisma`, le chargement ESM et des fixtures statistiques hors perimetre.

## Production evidence still required

Le module ne doit etre declare certifie qu'apres activation live du service payout, installation des secrets, transfert controle, reception du webhook, perte simulee du webhook suivie d'un rapprochement, et verification du recu et de l'ecriture comptable. Le protocole est dans `../BackendKati/deploiement/CERTIFICATION_FAPSHI.md`.
