# Collision de marque KatiHub / NowTech dans l'administration

## Question

Pourquoi l'interface servie sur `http://localhost:3102/fr` présente-t-elle encore de nombreuses références à NowTech alors qu'elle doit être le tableau de bord de KatiHub ?

## Méthode

- Requête HTTP sur `/fr`, puis sur la redirection publique `/fr/connexion?next=/fr`.
- Extraction du texte réellement rendu côté serveur.
- Recherche des occurrences `NowTech`, `Now Tech` et `Now-Tech` dans le code applicatif, les traductions et la configuration Nuxt.
- Comparaison avec les documents de transformation marketplace à la racine du dépôt.
- Inspection des composants de marque, des métadonnées de pages et des libellés français.

Le plugin Browser n'était pas disponible. Playwright n'est pas une dépendance du projet et son lancement via `bunx` a échoué avec `EPERM` sur le répertoire temporaire. Le navigateur local de secours n'était pas disponible non plus. L'audit n'a donc pas contrôlé la console navigateur, les états après authentification avec un compte réel, ni les dimensions mobile/tablette. Aucun code applicatif n'a été modifié.

## Constat principal — MAJEUR

La migration métier vers KatiHub a été ajoutée au produit historique NowTech, mais la couche d'identité de l'administration n'a pas été migrée. Le résultat n'est pas une référence isolée : deux marques actives cohabitent dans le même shell.

Les documents d'architecture établissent pourtant la séparation attendue :

- `../phases.md:5-7` décrit KatiHub comme la marketplace multi-vendeurs et NowTech comme une boutique de cette marketplace ;
- `../migration-nowtech.md:5-11` fait de NowTech la première boutique KatiHub et attribue le nouveau catalogue au domaine KatiHub.

Dans le frontend, l'identité de plateforme reste au contraire NowTech :

- `app/components/BrandWordmark.vue:10-31` rend explicitement le mot-symbole « Now Tech » ;
- `app/components/admin/AdminHeader.vue:11-14` réutilise ce mot-symbole dans l'en-tête de toutes les pages authentifiées ;
- `i18n/locales/common/fr.json:3` expose l'étiquette accessible « Administration NowTech » ;
- `nuxt.config.ts:233` déclare le nom global du site comme `NowTech Admin` ;
- `app/pages/index.vue:66-78` fixe le titre et la description du tableau de bord à NowTech dans les deux langues.

Ainsi, même si des modules métier KatiHub ont été ajoutés, le cadre visuel et sémantique qui les contient annonce toujours NowTech.

## Preuve rendue — MAJEUR

Sans session, `/fr` redirige vers `/fr/connexion?next=/fr`. La page de connexion rend côté serveur :

> Se connecter · Now Tech · © 2026 NowTech · NowTech Admin réunit vos opérations…

Ces textes proviennent directement de `app/components/BrandWordmark.vue` et de `i18n/locales/auth/fr.json:6,31,35`. Ce comportement prouve qu'il ne s'agit ni d'un cache du navigateur ni d'une donnée historique fournie par l'API.

## Étendue de la collision — MOYEN

La recherche trouve 140 occurrences de `NowTech` dans 55 fichiers du périmètre applicatif inspecté. Une partie correspond à des commentaires ou à des contrats techniques historiques et peut rester. En revanche, 22 fichiers de traduction contiennent des références qui alimentent directement l'interface.

Les surfaces visibles concernées comprennent notamment :

- connexion et mot de passe oublié ;
- en-tête global et accessibilité ;
- titres SEO du tableau de bord, des commandes, produits, clients, équipe, caisse, contenu, taxonomie et opérations ;
- assistant produit nommé « NowTech AI » (`i18n/locales/products/fr.json:761-781`) ;
- URL publique par défaut pointant vers `https://nowtech.newvcreatives.com` (`nuxt.config.ts:126`) ;
- exemples d'adresse d'équipe en `@nowtech.local`.

Le défaut est donc transversal. Corriger seulement le logo ou le titre de la page d'accueil laisserait la marque NowTech apparaître dans plusieurs parcours.

## Cause probable — MAJEUR

Le dépôt d'administration est encore structurellement le produit historique : le package s'appelle `nowtech-admin`, le site Nuxt s'appelle `NowTech Admin`, le composant de marque encode « Now Tech » et les traductions de chaque domaine reprennent ce nom. Les fonctionnalités KatiHub ont été intégrées progressivement sans chantier de rebranding du shell.

Il manque aussi une source de vérité unique pour l'identité de plateforme. La marque est dupliquée dans le composant, la configuration Nuxt, les traductions globales, les traductions par domaine et certaines URL. Cette duplication explique pourquoi une évolution métier peut être correcte tout en laissant une identité visuelle incohérente.

## Recommandation

Traiter le sujet comme une migration de marque complète, pas comme un remplacement textuel global :

1. Définir KatiHub comme identité du shell d'administration dans une source centrale : nom, mot-symbole, logo, libellé accessible, titre de site, support et URL de vitrine.
2. Remplacer les références visibles et SEO à NowTech dans les traductions françaises et anglaises, y compris « NowTech AI ».
3. Conserver NowTech uniquement là où il désigne réellement la boutique historique, un vendeur, une offre importée ou le schéma technique historique.
4. Vérifier après authentification toutes les pages de navigation et les exports/documentations destinés aux utilisateurs.
5. Ajouter un contrôle automatisé qui interdit `NowTech` dans les chaînes UI génériques, avec une liste d'exceptions explicites pour les contextes vendeur et migration.

## Limites

- Aucun compte n'a été utilisé ; les données API susceptibles d'afficher le nom de la boutique NowTech n'ont pas été inspectées.
- Les exports PDF, e-mails, notifications et la vitrine publique `websitekati` n'ont pas été audités.
- Aucun contrôle visuel desktop/mobile ni contrôle de console n'a pu être exécuté faute de navigateur automatisable disponible dans la session.
- L'audit distingue les références visibles de la plupart des références techniques, mais ne statue pas sur le renommage des schémas de base, variables d'environnement, clés de stockage ou noms de dépôt.
