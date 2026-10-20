# Walkthrough — Tarifs de livraison par quartier

## Comportement livré

- Les tarifs fixes sont maintenant configurés par quartier et mode (KatiHub ou vendeur), et non par ville. La ville reste affichée comme regroupement de quartiers.
- À la commande, le client choisit son quartier avant de voir les modes disponibles; les frais correspondants se mettent à jour immédiatement. Les quartiers sans tarif actif ne proposent pas la livraison à domicile.
- L’expédition en agence reste payable intégralement à la commande. Elle n’utilise plus de tarif fixe : les frais sont égaux à 10 % de la valeur totale des produits de la commande, calculés une seule fois.
- Les anciens tarifs domicile par ville sont copiés aux quartiers existants de la ville lors de la migration. Les anciens tarifs agence ne sont pas repris, car ils sont remplacés par la règle à 10 %.
- Le tableau de bord super-admin gère les tarifs par quartier et ne propose plus l’agence comme tarif fixe.

## Vérifications

- Backend : validation Prisma et génération du client réussies; 3 suites ciblées, 28 tests réussis. Le contrôle global des rollbacks compte 34 réussites, dont la nouvelle migration, mais échoue sur 5 migrations historiques sans rollback conforme (et 2 tests ignorés).
- Admin : 1 suite ciblée, 4 tests réussis. Les appels réseau de polices échouent dans l’environnement, sans bloquer les tests.
- Site : `npm run typecheck` et build de production réussis.
- Parcours navigateur bureau : 7 tests réussis, 2 scénarios ignorés par la suite; couvre la sélection de quartier, les tarifs distincts, l’agence à 10 % avec paiement complet et le règlement classique. Playwright a affiché tous les résultats, puis son arrêt a nécessité une interruption manuelle.

## Migration

La migration est additive : `quartierId` reste nullable pour préserver les lignes historiques, mais les nouvelles créations ne ciblent que les quartiers. Vérifier la sauvegarde DB et l’application des migrations en environnement de déploiement avant publication.
