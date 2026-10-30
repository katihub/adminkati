## What I built

Espace client organisé en profil/adresses, commandes, assistance/remboursements et KATI. Les onglets supplémentaires sont chargés à l’ouverture, avec query par identifiant client, erreurs, chargements et états vides.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Profil, adresses et commandes | Done | Composants existants conservés, `OrdersTab.vue` navigation française et clavier |
| KATI | Done | `users/KatiTab/KatiTab.vue`, contrat existant réservé direction |
| Assistance et remboursements | Done | `ActivityTab`, `CaseRecord`, GET `/clients/:id/activite` |
| Confidentialité et traçabilité | Done | Garde direction/comptoir, filtre exact clientId, limite 50 et audit de lecture |
| Mobile | Done | Entête/tabs adaptatifs et filtres clients dans leur propre conteneur défilant |

## Deviations

La nouvelle lecture backend est nécessaire pour ne pas charger les tickets de tous les clients. Les premières 50 entrées par liste et le total sont explicitement affichés. Le test de navigation française attend désormais la promesse réelle du routeur ; le chemin nommé localisé et la navigation clavier sont utilisés. Aucun champ de profil n’est réécrit.

## Tests

Frontend : dernier run combiné, 10 fichiers et 121 tests passants. Vérifications des accès, de la fiche sans profil, du chargement différé, du lien commande et des erreurs de section. Backend : 8 suites ciblées, 50 tests passants, dont refus avant DB et filtrage/limite/journal de l’activité client. Typecheck, lint, i18n et audit fallow réussis, avec seuls avertissements préexistants non bloquants.

Playwright (Browser plugin absent), API de recette locale : clients → assistance → KATI, données et état actif vérifiés. Écrans 1600×1000 et 390×844 ; débordement initial des filtres corrigé puis retesté, aucun débordement de page ni erreur console au dernier passage. Captures temporaires `katihub-domain-client-desktop.png` et `katihub-domain-client-mobile.png`.

## Not done

Pas de commit/déploiement ni de test sur données personnelles de production. Pas d’ajustement monétaire KATI ajouté à la fiche : l’administration financière dédiée reste l’endroit prévu. Les pièces et échanges complets sont accessibles via le dossier source, pas dupliqués dans l’annuaire.

## Notes for the reviewer

Déployer le backend avant ou avec l’admin pour rendre disponible `/v1/clients/:id/activite`. Le comptoir voit assistance/remboursements mais pas les KATI, conformément au contrat existant. Aucune migration Prisma n’est nécessaire.
