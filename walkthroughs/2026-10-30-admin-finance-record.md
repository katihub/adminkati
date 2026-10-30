## What I built

Vue financière par boutique avec soldes disponible/gelé, justificatifs bancaires valides et 50 dernières transactions/écritures. Les retraits existants restent actionnables selon leur statut, avec pagination, filtre boutique, erreurs visibles, dates de décision/reversement, tentatives PSP et téléchargement privé des preuves.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Synthèse et registre boutique | Done | `FinanceLedger`, `FinanceEntry`, route admin dédiée et calculs existants réutilisés |
| Retraits et commissions | Done | `SellerFinanceWorkspace.vue`, mutations existantes et invalidation du registre |
| Paiements, rapprochements, remboursements | Done | Accès aux modules PSP et litiges existants, références et contrôles par statut conservés |
| Justificatifs et trace | Done | Téléchargement authentifié, blocage purgé/non sain, empreinte et dates ; consultation backend journalisée |
| Droits et mobile | Done | Nouvelle lecture réservée direction, route vendeur non élargie, layout testé à 390 px |

## Deviations

Deux lectures administratives manquaient au programme ; pour la finance, ajout de GET `/marketplace/finance/administration/boutiques/:id`, sans dupliquer le calcul des soldes. Le sélecteur réutilise la liste réelle des boutiques du catalogue admin (une seule offre chargée). Les rapprochements de paiements restent dans la passerelle existante et les remboursements dans SAV, avec liens explicites, pour éviter deux workflows concurrents.

## Tests

Backend : 8 suites ciblées, 50 tests passants, dont refus du comptoir avant lecture des comptes, filtre boutique des écritures et audit. Frontend : dernier run combiné, 10 fichiers et 121 tests passants. Contrats des mutations de retrait/PSP et upload déjà testés, nouveaux tests de synthèse/erreur. `npm.cmd run build` backend réussi ; compilations admin réussies. Typecheck, lint, i18n et audit fallow réussis ; avis hérités non bloquants documentés dans les autres walkthroughs.

Playwright (Browser plugin absent), 127.0.0.1:4280 avec API temporaire contractuelle, 1600×1000 et 390×844 : ouverture depuis vendeur, registre lisible, refus désactivé sans motif, pas de débordement/overlay/page vide, dernier passage sans erreur console. Captures temporaires `katihub-domain-finance-desktop.png` et `katihub-domain-finance-mobile.png`.

## Not done

Pas de transaction financière réelle, test PSP externe, validation de stockage réel, commit ou déploiement. Les 50 dernières écritures sont un résumé administratif, pas un export comptable exhaustif.

## Notes for the reviewer

Livrer backend et admin ensemble, sans migration. Les données utilisées par Playwright sont uniquement celles du serveur temporaire de recette ; aucune donnée fictive n’a été insérée dans les sources applicatives ou dans une base. Le registre reste en lecture seule et les décisions monétaires restent protégées côté serveur.
