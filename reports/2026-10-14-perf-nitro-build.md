# Rapport de performance — lenteur du build Nitro

Date : 14 octobre 2026. Type : perf.

## Question

Pourquoi `bun run build` dure-t-il près de 12 minutes, alors que les builds Vite client et serveur prennent moins d'une minute ? Plusieurs comptes rendus précédents notaient une phase finale Nitro « anormalement longue », parfois interrompue.

## Méthode

1. Builds chronométrés seuls sur la machine (Windows 11, Node 24, bun 1.4.2), en changeant un seul réglage à la fois.
2. Horodatage des fichiers de `.output` pour situer le temps.
3. Profil CPU du build (`node --cpu-prof`), agrégé par fonction et par appelant.
4. Instrumentation temporaire de `tryResolve` dans `nitropack` (copie de sauvegarde, restaurée juste après) : nombre d'appels, échecs, durée par identifiant.

## Constats

| Mesure | Résultat |
| :-- | :-- |
| Build de référence | 706 à 709 s, dont environ 11 min dans la phase Nitro |
| Écriture des fichiers Nitro | toutes en fin de phase : le temps se passe avant l'écriture, dans Rollup |
| Profil CPU | 620 s sur 711 dans `tryResolve` du plugin `externals` de nitropack 2.13.4 (`exsolve` → `statSync`, exceptions `NodeError`) ; Rollup lui-même : 7 s |
| Instrumentation | 18 031 résolutions, 567 s. Échecs répétés sans cache : `vue/` (1 238 fois, 80 s), puis des milliers de chemins internes de `@ark-ui/vue`, `reka-ui`, `@zag-js`, `zod` qui ne figurent pas dans leur champ `exports` |
| Multiplicateur | Nuxt transmet 27 dossiers de modules ; chaque échec essaie dossier × 2 suffixes × 7 extensions |

Pistes écartées par la mesure :
- transpiler `@phosphor-icons/vue` : 709 s, aucun gain de temps, mais 11 Mo et 1 510 fichiers de moins dans `.output` (conservé pour ce gain de taille) ;
- limiter `@nuxt/icon` aux icônes utilisées : 692 s, gain négligeable et risque d'icône manquante (retiré).

## Correction retenue (`nuxt.config.ts`)

| Réglage | Build |
| :-- | --: |
| Référence | 709 s |
| `nitro.nodeModulesDirs` limité au `node_modules` racine | 650 s |
| + `nitro.externals.inline: ["@ark-ui/vue", "reka-ui", "@zag-js/", "zod"]` | **210 s** |

## Vérification

- Serveur de production démarré depuis `.output` : `/login` rendu côté serveur (200, 24 Ko) avec les composants `reka-ui` (`label`, `input`, `button`, `dropdown-menu-trigger`), aucune erreur au journal. Les paquets intégrés ne sont plus copiés dans `.output/server/node_modules`.
- Tests Nuxt ciblés (`operations-page`, `marketplace-disputes-workspace`) : 21 réussis.

## Limites

- Les pages connectées n'ont pas pu être rendues sur le build de production local : la connexion locale y est compilée hors du bundle (`NODE_ENV=production` figé au build), et Supabase n'est pas disponible sur ce poste. À contrôler sur l'environnement de recette après déploiement.
- Mesures faites sous Windows uniquement. Sous Linux, en CI comme en production, chaque `stat` coûte bien moins cher : le gain absolu y sera plus faible.
- `vue/` reste un échec répété (environ 80 s). Il vient de `@unhead/vue` ; intégrer `vue` au serveur est déconseillé par Nuxt. Une mise en cache dans `tryResolve` corrigerait le cas général : la proposer en amont à nitropack.

## Recommandation

Conserver les deux réglages Nitro. Si une nouvelle bibliothèque d'interface importe ses fichiers internes par des chemins non exportés et que le build ralentit à nouveau, l'ajouter à `nitro.externals.inline`, après avoir mesuré avec la même instrumentation.
