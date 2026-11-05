# Compte rendu : entrée « Kati Express » dans le menu Logistique

Plan : `plans/2026-11-05-menu-kati-express.md`.

## Résultat

- Le groupe **Logistique** du menu de gauche s'ouvre désormais sur **Kati Express**, suivi de Tarifs de livraison, Villes et quartiers, Services après-vente et Articles refusés.
- L'entrée mène à l'onglet Kati Express de la page Opérations : files « À attribuer », « En cours » et « Terminées », livreurs proposés, colonne Livreurs.
- Elle est réservée à la direction, comme l'onglet lui-même.
- Le groupe Logistique est marqué actif quand on est sur cet onglet.

## Modifications

- `app/utils/admin-navigation.ts` : nouvelle entrée `kati-express` (icône `ph:moped`).
- `i18n/locales/common/fr.json` et `en.json` : libellé « Kati Express ».
- `test/unit/admin-navigation.test.ts` : ordre du groupe Logistique, et cas « kati-express active Logistique ».

## Vérification

- `admin-navigation` (unitaire et Nuxt) et `operations-page` : tous les tests passent.
