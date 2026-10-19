# Import de produits par tableur

## Objectif

Permettre à la direction d’envoyer un fichier CSV ou Excel, de vérifier chaque produit avant toute écriture, puis de confirmer la création des seules lignes valides avec un rapport final exploitable.

## Réutilisation

- Le lecteur CSV/XLSX sécurisé et ses limites proviennent de `BackendKati/src/catalogue/stock/stock-import.parser.ts`.
- La création conserve les règles de `AdministrationCatalogueService.creerProduit` : prix en FCFA, slug unique, catégories, images, stock initial, historique et revalidation de la vitrine.
- Le dialogue reprend les composants et états déjà éprouvés par `ProductsStockImportDialog` : dépôt de fichier, progression, aperçu, résultat et erreur locale.
- Le proxy multipart existant `/api/v1/**`, TanStack Query, `useApiWrite`, les boutons et les jetons du dashboard restent inchangés.

## Contrat de données

- Nouveau `POST /v1/catalogue/administration/produits/import`, réservé au rôle `direction`, multipart :
  - `fichier` : `.csv` ou `.xlsx`, 5 Mio maximum, première feuille, 500 produits maximum ;
  - `apercu=true` : valide et résout les références sans écrire ;
  - sans `apercu` : crée les lignes valides et retourne le résultat de chaque ligne.
- Colonnes obligatoires : `nom`, `prix`.
- Colonnes facultatives : `slug`, `prix_reference`, `marque`, `categorie_id`, `quantite_stock`, `description`, `fiche_technique`, `caracteristiques` (séparées par `|`), `image_url`, `image_alt`.
- Réponse : `apercu`, totaux `pretes`, `creees`, `echouees`, puis `lignes` avec numéro, nom, prix, slug résolu, catégorie, statut, identifiant créé et erreur éventuelle.

## États de l’interface

- Initial : téléchargement du modèle, dépôt ou sélection du fichier et rappel des formats/colonnes.
- Prévisualisation en cours : progression locale, dialogue non ambigu.
- Aperçu : compte des lignes prêtes/en erreur et tableau des produits interprétés ; aucune écriture.
- Import en cours : blocage de la fermeture pour éviter une action répétée pendant la requête.
- Résultat : produits créés et lignes refusées, avec possibilité de fermer puis de voir la liste rafraîchie.
- Erreur globale : rejet du fichier ou panne réseau avec retour au choix de fichier.

## Phases

### 1. Lecture et validation backend

- **Ce qui change** : exposer le lecteur tabulaire sécurisé, parser les colonnes produit, borner les cellules et valider les valeurs et doublons.
- **Où** : `BackendKati/src/catalogue/stock/stock-import.parser.ts`, nouveaux fichiers `src/catalogue/import-produits/*` et tests associés.
- **Terminé quand** : CSV avec virgule/point-virgule et XLSX produisent les mêmes lignes ; fichiers hostiles, colonnes absentes, valeurs invalides, doublons et références inconnues sont refusés sans écriture.

### 2. Aperçu et création

- **Ce qui change** : ajouter la route multipart, l’aperçu sans effet de bord et l’import partiel par ligne, avec slug explicite stable pour empêcher les doublons lors d’une relance.
- **Où** : `BackendKati/src/catalogue/administration/administration.controller.ts`, `administration.service.ts`, `catalogue.module.ts`, service et types d’import.
- **Terminé quand** : l’aperçu n’écrit rien, l’application crée uniquement les lignes prêtes, un slug déjà utilisé échoue au lieu d’être suffixé silencieusement, et le backend compile.

### 3. Parcours dashboard

- **Ce qui change** : ajouter « Importer des produits », le modèle CSV, la sélection CSV/XLSX, l’aperçu lisible et le rapport final ; invalider la liste après création.
- **Où** : `adminkati/app/pages/products.vue`, nouveaux composants `app/components/products/ProductImport*`, nouveaux types/utilitaires, traductions `i18n/locales/products/{fr,en}.json` et tests Nuxt/unitaires.
- **Terminé quand** : la direction peut parcourir dépôt → aperçu → confirmation → résultat, le comptoir ne voit pas l’action, les états invalides sont explicites et le rendu reste utilisable sur mobile.

## Tests

- Backend : parsing, validation des limites, aperçu sans écriture, import partiel, collision de slug, contrôle du rôle et fichier trop volumineux.
- Admin : génération du modèle CSV, rejet type/taille, aperçu des lignes, confirmation, résultat et visibilité direction uniquement.
- Vérification : tests ciblés, lint, i18n, typecheck, audit de complexité, builds backend/admin et parcours Playwright desktop/mobile.

## Risques

- Les anciens fichiers binaires `.xls` ne sont pas supportés par le lecteur sécurisé présent. L’interface nomme précisément `.xlsx` et demande de réenregistrer un `.xls` dans ce format.
- Un aperçu devient périmé si une catégorie ou un slug change avant confirmation ; l’application revalide chaque ligne au moment de créer.
- Une réponse réseau perdue peut laisser certains produits créés. Le slug explicite et déterministe empêche une relance de créer une seconde copie silencieuse.

## Hypothèses retenues

- « XLS » désigne le besoin d’import Excel ; le format livré est `.xlsx`, format actuel déjà sécurisé et supporté par la plateforme.
- Une erreur sur une ligne ne bloque pas les autres produits valides.
- Les images sont référencées par URL dans cette première version ; le tableur n’embarque pas de fichiers binaires.

## Questions ouvertes

Aucune question bloquante. Un vrai lecteur du format binaire `.xls` pourra être ajouté plus tard avec une dépendance dédiée si des fournisseurs ne peuvent pas réenregistrer leurs fichiers en `.xlsx`.
