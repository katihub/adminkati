# Alignement dashboard super-admin / backend marketplace

## Objectif

Garantir que chaque indicateur du command center super-admin repose sur la meme definition metier que la surface operationnelle vers laquelle il renvoie.

## Contrats a verrouiller

- La somme de la repartition des statuts doit etre egale au nombre total de commandes marketplace de la periode.
- Les etats exceptionnels (`retour_ouvert`, `annulation_demandee`, cloture sans preuve ou etat futur non classe) doivent apparaitre dans une file `attention`.
- Le nombre de litiges ouverts doit compter les retours encore actionnables par l'equipe operations, pas toutes les demandes support ouvertes.
- Le GMV ne doit pas inclure une commande annulee, refusee ou cloturee pour echec/expiration.
- Les commissions restent explicitement des commissions prevues tant que l'acquisition comptable n'est pas encore emise par le backend ; les sous-commandes annulees, refusees, perdues ou en echec en sont exclues.

## Verification

1. Tests unitaires du mapping et de ses invariants.
2. Test du contrat SQL (predicats GMV, litiges et statuts).
3. Typecheck/build backend et typecheck/lint admin.
4. Verification de la somme des statuts et des libelles frontend.

