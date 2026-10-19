# Requêtes saisies dans la recherche client

## Objectif

Conserver chaque recherche effectivement validée depuis les barres de recherche de la vitrine, sans enregistrer les frappes intermédiaires ni l’identité du visiteur, puis rendre ces données lisibles par la direction dans une zone dédiée du tableau de bord.

## Réutilisation

- La recherche principale reste portée par `websitekati/src/components/marketplace/KatiHeader.tsx` et `websitekati/src/components/layout/SearchField.tsx`.
- Le proxy public Next.js suit le modèle des routes de `websitekati/src/app/api/`.
- L’API protégée réutilise `CatalogueModule`, `PrismaService`, `@Roles(Role.direction)` et le proxy `/api/v1/**` de l’admin.
- La zone du tableau de bord réutilise `StatsBlockShell`, TanStack Query, `ApiErrorCard` et les jetons visuels existants.

## Contrats de données

- Nouveau `POST /v1/catalogue/requetes-clients` public : `{ requete: string, rayon?: string }`, réponse `204`. Le texte est validé, nettoyé et normalisé ; aucune adresse IP ni identité client n’est stockée.
- Nouveau `GET /v1/catalogue/administration/requetes-clients?jours=7|30|90`, réservé au rôle `direction` :
  - `resume`: total, nombre de termes uniques, total du jour ;
  - `populaires`: terme normalisé, nombre d’occurrences, dernière recherche ;
  - `recentes`: identifiant, texte saisi, rayon éventuel, date.
- Nouveau modèle Prisma `RequeteRechercheClient`, indexé par date et par terme normalisé/date.

## États de l’interface

- Chargement : squelette local de la zone, sans masquer le reste du tableau de bord.
- Erreur : carte d’erreur locale avec bouton de nouvelle tentative.
- Vide : message expliquant que les recherches apparaîtront après les premières validations.
- Données : trois indicateurs, les recherches populaires et le fil récent, avec sélecteur 7/30/90 jours.
- La zone n’est demandée ni affichée aux rôles autres que `direction`.

## Phases

### 1. Persistance et API

- **Ce qui change** : ajouter le modèle, la migration, la validation, l’enregistrement public et l’agrégation réservée à la direction.
- **Où** : `BackendKati/prisma/schema.prisma`, `BackendKati/prisma/migrations/20261018150000_requetes_recherche_clients/migration.sql`, `BackendKati/src/catalogue/requetes-clients.*`, `BackendKati/src/catalogue/catalogue.module.ts`, contrôleurs catalogue public et administration.
- **Terminé quand** : les tests prouvent le nettoyage, l’enregistrement sans identité, les statistiques bornées par période et l’autorisation `direction` ; le backend compile.

### 2. Capture côté vitrine

- **Ce qui change** : journaliser uniquement une recherche validée (soumission ou choix d’une suggestion), via une route Next.js résiliente ; une panne du journal ne doit jamais bloquer la navigation.
- **Où** : `websitekati/src/lib/customer-search.ts`, `websitekati/src/app/api/customer-searches/route.ts`, `websitekati/src/components/marketplace/MarketplaceSearchForm.tsx`, `KatiHeader.tsx`, `SearchField.tsx`.
- **Terminé quand** : les deux barres envoient le terme final et continuent leur navigation même si le journal est indisponible ; TypeScript et ESLint passent.

### 3. Zone super-admin

- **Ce qui change** : ajouter le contrat TypeScript, la requête TanStack, la carte de synthèse et son intégration au pilotage pour la direction uniquement.
- **Où** : `adminkati/app/types/api/customer-searches.ts`, `app/composables/useCustomerSearches.ts`, `app/components/stats/CustomerSearchRequests/CustomerSearchRequests.vue`, `app/pages/index.vue`, `app/utils/api-query-keys.ts` et traductions locales du composant.
- **Terminé quand** : un test de composant couvre données, vide, erreur, changement de période et invisibilité hors direction ; lint, format, typecheck, tests et build passent.

## Tests

- Backend : validation hostile/limites, insertion normalisée, agrégations et bornage des périodes.
- Admin : contrat visuel fonctionnel et contrôle du rôle, sans tester les détails de classes.
- Vitrine : vérification TypeScript/lint/build et parcours navigateur de soumission ; la journalisation reste non bloquante.

## Risques

- Les anciennes réponses catalogue sont mises en cache : la capture doit donc partir de l’action de soumission, pas de la route de lecture du catalogue.
- Les requêtes peuvent contenir des données personnelles saisies par erreur : aucun identifiant visiteur, IP ou user-agent n’est conservé, et les longueurs sont bornées.
- Le tableau de bord ne doit pas ajouter une cascade de lectures : ses statistiques sont servies par un seul endpoint dont les trois requêtes SQL indépendantes s’exécutent en parallèle.

## Hypothèses retenues

- « Customer requests » désigne ici les recherches finales validées, pas chaque préfixe produit pendant la frappe.
- Les recherches issues de l’image ne sont pas enregistrées dans cette première vue, puisqu’elles ne sont pas tapées dans la barre.
- Le super-admin correspond au rôle backend `direction`.

## Questions ouvertes

Aucune question bloquante. Une politique de rétention pourra être définie ultérieurement ; cette livraison ne supprime aucune donnée sans instruction explicite.
