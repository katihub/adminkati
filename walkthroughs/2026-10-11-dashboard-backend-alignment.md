# Alignement dashboard super-admin / backend marketplace

## Resultat

Le command center utilise maintenant les memes notions que les ecrans operationnels :

- `Litiges ouverts` compte les retours marketplace encore actionnables (`demande`, `autorise`, `en_transit`, `recu`) et non les simples demandes support.
- Le GMV exclut les commandes annulees/refusees ainsi que les clotures pour echec de livraison ou expiration du retrait.
- La repartition des commandes contient une ligne `A examiner` pour les retours ouverts, annulations demandees, clotures sans preuve et futurs etats non classes.
- Le backend refuse une repartition impossible dont le sous-total depasse le nombre de commandes.
- Le libelle `Commissions prevues` est conserve : le schema financier connait la commission acquise, mais aucun flux backend ne l'emet encore dans le registre. Les sous-commandes annulees, refusees, perdues ou en echec ne gonflent plus ni cette projection ni le classement vendeur.

## Preuves

- Tests backend statistiques : 2 suites, 9 tests passes.
- Build NestJS : passe.
- Typecheck Nuxt : passe.
- Oxlint des fichiers touches : passe.
- Base de recette : `orders=1`, `status_sum=1`, `attention=0`, `open_disputes=0`.

## Limite d'outillage

Le test de composant Nuxt est present, mais le runner s'arrete pendant le chargement de `vitest.config.ts` avec une `DataCloneError` dans `@nuxt/test-utils` 4.1.0, avant l'execution des assertions. Le typecheck et le lint couvrent le contrat compile ; le correctif amont remplace deja ce clonage strict par une copie tolerante dans la branche courante de `nuxt/test-utils`.
