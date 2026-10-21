# Catalogue marketplace pour la direction

## Objectif

Donner à la direction une vue de toutes les offres de toutes les boutiques, quel que soit leur statut, avec des filtres par boutique, statut, catégorie et niveau de stock, des tris (boutique, nom, prix, stock, date) et une pagination. Les écrans existants restaient partiels : « Produits vérifiés » plafonne à 50 offres publiées, la modération ne montre que ce qui attend une décision, l'espace marchand qu'une boutique, et la page « Produits » du panel lit l'ancien catalogue `nowtech.produits`, pas la marketplace.

## Réutilisation

- Backend : le garde `@Roles(Role.direction)`, `PrismaService`, les conventions de DTO `class-validator` et le calcul de disponibilité `quantite - quantiteReservee` déjà employé par la vitrine.
- Admin : la page `operations.vue` et son système d'onglets réservés à la direction, le modèle `VerifiedOffersWorkspace.vue`, `useApiFetch`, `useMarketplaceCategories`, `NativeSelect`, `Table`, `Badge`, `ApiErrorCard`, `EmptyStateCard` et `storefrontProductUrl`.

## Décisions

- Lecture seule. Les décisions (approbation, suspension, badge vérifié) restent dans leurs écrans de modération.
- Route dédiée `GET /v1/marketplace/administration/offres`, dans un service et un contrôleur séparés plutôt que dans `OffresService`, déjà au-delà de 1 000 lignes.
- Pagination côté serveur : 50 par page par défaut, 100 au plus. Une page de 3 400 offres ne se charge pas d'un bloc dans un navigateur.
- Une catégorie racine retient aussi ses sous-catégories.
- Stock : « rupture » = disponible nul ou absence de ligne de stock ; « faible » = de 1 à 5 unités (quantité ≤ 5 et supérieure au réservé) ; « disponible » = reste positif. Une boutique qui ne suit pas son stock n'est jamais en rupture et affiche « Non suivi ».
- La comparaison au réservé se fait en base par référence de champ Prisma (`fields.quantiteReservee`), sans charger les offres.
- Les compteurs par statut sont ceux de toute la plateforme, indépendants des filtres ; la liste des boutiques porte leur nombre d'offres.
- Lien vers la vitrine uniquement pour une offre publiée.

## Contrat

`GET /v1/marketplace/administration/offres?recherche&boutiqueId&statut&categorieId&stock&tri&page&taille`, direction uniquement (403 sinon, 401 sans jeton, 400 sur paramètre invalide). Réponse : `{ elements, pagination: { page, taille, total, pages }, compteurs, boutiques }`. Chaque élément porte l'offre, son produit (avec la première photo publiée), sa boutique et son vendeur, et `stock: { suivi, quantite, reservee, disponible }`.

## Vérification prévue

Tests unitaires backend (filtres, tris, accès, pagination, validation), test de composant admin (filtres transmis, pagination, remise à zéro, état vide), mise à jour du test de la page Opérations, puis essai réel sur la base locale et captures d'écran.
