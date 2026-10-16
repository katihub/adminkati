# Système de marque KatiHub

## Requirement

Remplacer transversalement l'identité NowTech du tableau de bord par KatiHub et fournir une source de vérité unique pour les valeurs de marque utilisées par le shell, la configuration Nuxt et les contrôles de non-régression. NowTech doit rester uniquement lorsqu'il désigne réellement la boutique ou l'infrastructure historique.

## Assumptions

- Le nom de plateforme affiché est `KatiHub` et le nom du produit d'administration est `KatiHub Admin` en anglais comme en français.
- L'assistant de rédaction devient `KatiHub AI`.
- Le logo officiel existant dans `../websitekati/public/katihub-logo-official.png` est la référence visuelle à réutiliser ; aucun nouveau visuel n'est inventé.
- Aucun domaine public KatiHub n'est confirmé dans le dépôt. Le lien de vitrine n'aura donc plus de domaine NowTech par défaut et restera piloté par `NUXT_PUBLIC_STOREFRONT_URL`.
- Les noms de schéma, références backend, documents de migration, noms historiques de dépôt et commentaires qui décrivent réellement NowTech restent hors du rebranding UI.

## Reuse

- `app/components/BrandWordmark.vue` reste le composant partagé entre connexion et en-tête authentifié.
- `useSeoMeta` et les fichiers i18n existants restent les mécanismes de métadonnées et de traduction.
- Les tokens Tailwind sémantiques existants (`text-foreground`, `text-primary`, `bg-background`) restent la palette du shell.
- Le logo KatiHub déjà livré par la vitrine est copié dans `public/` et servi par `NuxtImg`.

## Data contracts and states

- Aucun endpoint, payload ou état asynchrone ne change.
- Un objet immuable exporté depuis `brand.config.ts` porte les valeurs communes : nom, nom d'administration, nom de l'assistant, segments du wordmark, chemin du logo et URL de vitrine par défaut.
- Si `NUXT_PUBLIC_STOREFRONT_URL` n'est pas configurée, le lien produit vers une ancienne vitrine NowTech reste absent, comme le permet déjà `storefrontProductUrl` pour une origine invalide.

## Tests

- Un test de contrat de marque doit échouer avant implémentation puis vérifier les valeurs centralisées et l'absence de `NowTech` dans les chaînes UI génériques.
- Les tests Nuxt existants du wordmark/connexion, des métadonnées de l'accueil et du lanceur IA doivent fixer les nouveaux libellés KatiHub.
- Les contrôles i18n, typecheck, lint et build vérifient la cohérence transversale.

## Risks

- Le fichier de logo officiel est carré et contient le mot-symbole complet. Le composant doit le recadrer proprement pour la petite taille d'en-tête tout en gardant le texte KatiHub lisible.
- Une URL de production KatiHub inventée serait plus grave que l'absence du lien. Le défaut reste vide jusqu'à configuration explicite.
- Un remplacement aveugle pourrait altérer les contrats historiques NowTech. La recherche finale doit distinguer UI générique et références techniques autorisées.

## Open questions

- Domaine officiel de la vitrine KatiHub : non documenté. Recommandation retenue : variable d'environnement obligatoire, sans valeur NowTech par défaut.
- Dénomination française : `KatiHub Admin` ou `Administration KatiHub`. Recommandation retenue : `Administration KatiHub` dans les titres français, `KatiHub Admin` comme nom de produit central.

## Phase 1 — Verrouiller le contrat de marque

- **What changes:** ajouter des tests qui exigent l'identité KatiHub et refusent les anciennes chaînes NowTech dans les surfaces UI génériques.
- **Where:** `test/unit/brand-config.test.ts`, `test/nuxt/brand-wordmark.test.ts`, `test/nuxt/index-metadata.test.ts`, `test/nuxt/ai-generation-launcher.test.ts`.
- **Done when:** les tests ciblés échouent uniquement parce que le code rend encore NowTech.

## Phase 2 — Centraliser et rendre la marque

- **What changes:** créer le contrat de marque, réutiliser le logo officiel, rendre le wordmark KatiHub et alimenter le nom global Nuxt ainsi que la valeur par défaut de vitrine depuis ce contrat.
- **Where:** `brand.config.ts`, `public/katihub-logo-official.png`, `app/components/BrandWordmark.vue`, `nuxt.config.ts`, `package.json`, `bun.lock`, `.env.example`, `README.md`.
- **Done when:** le shell et la configuration n'embarquent plus d'identité NowTech générique, le package s'appelle `katihub-admin`, et le wordmark conserve ses variantes `sm`/`md`.

## Phase 3 — Rebrander toutes les chaînes visibles

- **What changes:** remplacer les titres, descriptions, mentions légales, placeholders et libellés IA génériques par KatiHub dans les deux langues, sans modifier les références historiques techniques.
- **Where:** `app/pages/index.vue`, `i18n/locales/{assistant,auth,caisse,common,content,operations,orders,products,taxonomy,team,users}/{en,fr}.json`, ainsi que les commentaires UI directement liés à l'ancien nom.
- **Done when:** la recherche ciblée ne trouve plus `NowTech` dans `i18n/`, le wordmark, les métadonnées de pages ou les composants UI génériques.

## Phase 4 — Vérifier le rendu et les garde-fous

- **What changes:** exécuter les tests ciblés puis les portes qualité et contrôler la réponse HTTP de `/fr` et de la page de connexion.
- **Where:** commandes du projet et serveur local `http://localhost:3102/fr`.
- **Done when:** tests, i18n, lint, typecheck et build passent ; le HTML rendu contient KatiHub et aucune mention générique de NowTech. Si l'automatisation navigateur reste indisponible, cette limite est consignée dans le walkthrough.
