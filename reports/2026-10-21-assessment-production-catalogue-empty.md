# Catalogue produits vide en production

## Question

Pourquoi le tableau de bord de production affiche-t-il un nombre total de produits alors que la page catalogue ne montre aucune ligne sur laquelle agir ?

## Methode

- Lecture du flux du compteur dans `BackendKati/src/statistiques/statistiques.service.ts`.
- Lecture du flux de liste dans `adminkati/app/pages/products.vue`, `adminkati/app/components/products/ListPanel.vue`, `adminkati/app/composables/useProduits.ts` et `BackendKati/src/catalogue/administration/administration.service.ts`.
- Verification HTTP publique de l'API de production : `/sante` repond 200 et la route catalogue d'administration repond 401 sans session, comme attendu pour une route protegee.
- Verification des mecanismes de deploiement du schema dans `BackendKati/Dockerfile`, `BackendKati/scripts/appliquer-sql.mjs` et `BackendKati/sql/ordre.txt`.

## Constats

1. Le compteur et la liste ne viennent pas de la meme requete. Le compteur du tableau de bord execute un `count(*)` direct sur `nowtech.produits`, tandis que la page catalogue appelle `GET /v1/catalogue/administration/produits`.
2. La liste peut donc echouer alors que le compteur reste correct. La requete de liste depend notamment des fonctions et colonnes posees par les fichiers SQL du catalogue, ainsi que de la table d'inventaire.
3. Le panneau masque actuellement cette distinction : dans `ListPanel.vue`, une erreur de chargement et une vraie liste vide rendent volontairement le meme message « aucun produit ». Le symptome observe ne prouve donc pas que l'API a renvoye zero produit ; il est compatible avec une reponse 4xx/5xx ou un echec de requete.
4. Le depot courant contient deja la protection de deploiement attendue : le conteneur backend lance `prisma migrate deploy`, puis `scripts/appliquer-sql.mjs`, avant l'API. Un conteneur de production construit avant ce correctif, ou un demarrage dont l'application SQL a echoue, peut garder le compteur fonctionnel et casser uniquement la liste detaillee.
5. L'API de production est joignable et sa base est declaree disponible par `/sante`. La reponse protegee du catalogue et les journaux Coolify n'ont pas pu etre examines sans session operateur ni acces aux journaux.

## Recommandation

1. Dans la session de production, relever le statut et la reponse de `/api/v1/catalogue/administration/produits?etat=tous&tri=recent&page=1&taille=50` dans l'onglet Reseau.
2. Si la reponse est 500, verifier dans les journaux Coolify que `prisma migrate deploy` et `scripts/appliquer-sql.mjs` se terminent avant le demarrage de Nest, puis redeployer `BackendKati` depuis `main`.
3. Si la reponse est 200, conserver le corps JSON pour verifier le contrat `{ total, page, taille, pages, produits }` et corriger ensuite le desalignement exact sans supposition.
4. Dans un correctif UI separe, distinguer l'erreur reseau de l'etat vide et fournir une action de relance ; cela evitera qu'une panne soit presentee comme un catalogue sans produit.

## Limites

- Aucun compte de production ni journal Coolify n'etait accessible pendant l'analyse.
- Aucune ecriture, migration, relance ou redeploiement de production n'a ete effectue.
- Aucun correctif source n'a ete applique : l'etat HTTP authentifie de la requete de liste manque encore pour choisir entre un correctif de donnees, de deploiement, d'API ou de contrat frontend.
