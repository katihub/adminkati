# Renommage visible en KatiMarket

## Intention et périmètre

Remplacer l’ancienne marque d’interface « KatiHub » par « KatiMarket » dans la vitrine, le tableau de bord d’administration et les contenus backend que reçoivent les utilisateurs (messages, courriels et PDF). « Kati Hub SARL » reste la raison sociale propriétaire et ne doit pas être modifiée lorsqu’elle apparaît comme telle.

Ne pas renommer les contrats techniques ou commerciaux historiques : enum/valeurs `katihub` (notamment le mode de livraison), domaines et courriels `katihub.cm`, clés de stockage local/événements/API, identifiants de format, ni le nom de service « Kati Express ». Les descriptions visibles qui attribuent ce service à la plateforme peuvent présenter KatiMarket comme opérateur sans changer son nom.

## Réutilisation

- Vitrine Next : garder les composants `KatiHeader`, `KatiFooter`, `KatiLogo` et le layout racine ; modifier leurs libellés et métadonnées à leur source, sans recréer d’habillage.
- Admin Nuxt : `brand.config.ts` est déjà la source des noms, wordmark, favicon et logo ; `BrandWordmark.vue` consomme ce contrat. Compléter via les ressources i18n existantes (`i18n/locales/{common,auth,operations,content,products,...}/{fr,en}.json`) et les métadonnées de pages.
- Backend Nest : conserver les mêmes contrats d’API et remplacer uniquement les chaînes effectivement renvoyées ou émises aux clients/vendeurs.

## Contrats de données et états

Aucun endpoint, schéma, enum, champ de persistance, clé de navigateur, payload ou URL ne change. Le nom exposé au public devient `KatiMarket`; la raison sociale explicite demeure exactement `Kati Hub SARL`. Il n’y a pas de nouvel état de chargement/erreur : les états et comportements existants doivent rester identiques.

## Plan d’exécution

### 1. Mettre à jour le wordmark et l’interface admin

- **Changements :** centraliser le nom `KatiMarket`, le libellé `KatiMarket Admin`, le nom d’assistant selon son usage visible et les segments du wordmark dans la config actuelle. Mettre à jour les titres/descriptions auth, les titres de pages, les libellés visibles des opérations (catalogue, badge de vérification, attribution à la plateforme, réglages et contenu) dans les deux langues. Auditer tous les composants Vue pour les libellés non externalisés.
- **Fichiers principaux :** `adminkati/brand.config.ts`, `adminkati/app/pages/index.vue`, `adminkati/app/components/BrandWordmark.vue` seulement si le contrat visuel l’exige, `adminkati/i18n/locales/common/{fr,en}.json`, `auth/{fr,en}.json`, `operations/{fr,en}.json`, `content/{fr,en}.json`, `products/{fr,en}.json`, `orders/{fr,en}.json`, `users/{fr,en}.json`, `team/{fr,en}.json`, `taxonomy/{fr,en}.json`, `caisse/{fr,en}.json`, `assistant/{fr,en}.json` et les autres ressources trouvées par recherche ciblée dans `adminkati/i18n/locales/`.
- **Done when :** les vues d’authentification, navigation, en-tête, pages SEO et libellés opérationnels affichent KatiMarket en français et anglais, sans clé de traduction manquante ni déséquilibre de parité.

### 2. Mettre à jour la vitrine et ses surfaces publiques

- **Changements :** remplacer la marque dans le logo textuel, navigation/footer, titres/metadata SEO, pages marketplace, espace vendeur, labels et textes d’assistance/commande/compte, messages de secours API et réponses générées par l’assistant. Ne pas toucher aux clés de stockage contenant `katihub`.
- **Fichiers principaux recensés :** `websitekati/src/components/marketplace/KatiLogo.tsx`, `KatiHeader.tsx`, `KatiFooter.tsx`; `websitekati/src/app/layout.tsx`, `page.tsx`, `devenir-vendeur/page.tsx`, `catalogue/page.tsx`, `boutiques/page.tsx`, `boutiques/[slug]/page.tsx`, `categories/page.tsx`, `categories/[slug]/page.tsx`, `marques/page.tsx`, `compte/assistance/CentreAssistance.tsx`, `compte/kati/{page.tsx,MesKati.tsx,TransfertKati.tsx}`, `compte/favoris/{page.tsx,MesFavoris.tsx}`, les pages `devis/`, `marketplace/commande/` et `marketplace/produits/`, ainsi que les autres textes visibles détectés par `rg` dans `websitekati/src/app/` et `websitekati/src/components/`.
- **Done when :** aucune ancienne marque n’est visible dans les parcours public, vendeur, compte et checkout (desktop et mobile), y compris titre d’onglet, métadonnées et textes d’erreur.

### 3. Mettre à jour les sorties utilisateur du backend

- **Changements :** remplacer les noms de marque dans le nom d’expéditeur et les gabarits de courriels, salutations/réponses d’assistant, erreurs visibles par client/vendeur, notifications et PDFs ; garder les messages internes, commentaires et documentation hors périmètre.
- **Fichiers identifiés :** `BackendKati/src/courriel/courriel.service.ts`, `src/vendeurs/vendeurs.service.ts`, `src/profil/verification-courriel.service.ts`, `src/assistant/assistant.service.ts`, `src/assistant/demandes.service.ts`, `src/assistant/notifications-assistance.service.ts`, `src/marketplace/notifications/notifications-marketplace.service.ts`, `src/marketplace/devis/devis-pdf.ts`, `src/marketplace/finance/finance-vendeur.service.ts`; compléter par une recherche de chaînes visibles dans `BackendKati/src/` en excluant tests, commentaires seulement et documentation.
- **Done when :** les courriels de vérification/invitation/assistance, messages de service et PDF générés portent KatiMarket; « Kati Hub SARL » reste intacte si présente.

## Vérifications et tests

- Faire une recherche d’audit sur l’ensemble de `websitekati/src`, `adminkati/app`, `adminkati/i18n/locales` et les textes de sortie dans `BackendKati/src`. Pour chaque occurrence restante de `KatiHub`/`Kati Hub`, justifier explicitement qu’il s’agit d’un identifiant technique conservé, d’une documentation/commentaire hors scope, d’une fixture, ou de la raison sociale.
- Vérifier explicitement qu’aucune clé `katihub`, domaine/courriel `katihub.cm`, nom « Kati Express », clé API/stockage ou identifiant de format n’a changé.
- Admin : `bun run i18n:check`, `bun run typecheck`, `bun run test:unit`, lint/format sur fichiers modifiés et `bun run build`.
- Vitrine : `npm run typecheck`, `npm run lint`, tests pertinents du site puis `npm run build`; contrôler visuellement le header/footer, authentification, checkout, espace vendeur et pages compte sur vues mobile et bureau.
- Backend : exécuter les tests unitaires des modules courriel, profil, vendeurs, assistant, notifications marketplace et PDF (ajouter ou ajuster des assertions ciblées sur le texte d’expéditeur, texte, HTML, en-tête PDF et métadonnées PDF). Vérifier qu’un devis et un reçu restent générables.

## Risques et décisions

- Les tests peuvent affirmer l’ancienne copie visible : ne les supprimer que si le libellé attendu est mis à jour, sans affaiblir les assertions métier.
- Le visuel `websitekati/public/katihub-logo-official.png` (également présent sous `adminkati/public/`) inscrit explicitement KATI HUB. Il est utilisé par `KatiLogo.tsx`, `BrandWordmark.vue` et comme favicon admin : le laisser actif rendrait le renommage incomplet. Aucun logo KatiMarket de remplacement n’a été trouvé dans les assets. **Recommandation :** pour cette première passe, ne plus afficher cet ancien lockup; utiliser le wordmark textuel configurable KatiMarket et un pictogramme existant uniquement s’il ne contient pas l’ancien nom. Remplacer ultérieurement par un asset officiel approuvé, sans inventer une nouvelle identité graphique.
- Les bannières, images téléversées et contenus modifiables depuis les tableaux de bord peuvent incorporer l’ancienne marque dans leurs pixels : ce contenu éditorial hors source n’est pas migré par ce plan; faire un contrôle des bannières visibles et prévoir leur remplacement côté contenu si nécessaire.
- Aucun changement de fournisseur, domaine, adresse e-mail technique, configuration de déploiement ou migration de données n’est autorisé dans ce renommage.

## Question ouverte

- Un nouveau logo KatiMarket existe-t-il déjà et peut-il être fourni ? **Recommandation :** continuer sans bloquer avec le wordmark texte en attendant l’asset; ne pas réutiliser le lockup KatiHub.

## Préservation du travail préexistant

Les changements non commités dans `websitekati/src/components/marketplace/SellerSignupForm.tsx`, `websitekati/src/app/devenir-vendeur/seller.module.css`, `websitekati/e2e/inscription-vendeur.spec.ts`, et dans `BackendKati/src/vendeurs/` ainsi que la migration `20261020140000_categories_vente_boutique/` appartiennent à un autre travail. Les conserver tels quels; toute modification de texte de marque dans ces fichiers doit rester limitée aux libellés visibles et être isolée de la logique d’inscription/CNI/catégories.
