## What I built

L'écran « Litiges et retours » affiche l'état de sécurité de chaque pièce et permet à la direction d'exporter le dossier complet :

- une pièce **en analyse**, **bloquée** (menace détectée) ou **effacée** (fin de conservation) affiche un badge explicite, et son téléchargement est désactivé au lieu d'échouer au clic ;
- le bouton **Exporter le dossier**, visible par la seule direction, télécharge `dossier-<référence>.zip`. Un échec est annoncé dans l'en-tête du dossier.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Types et états des pièces | Done | `app/types/api/marketplace-operations.ts`, `app/components/operations/MarketplaceDisputesWorkspace.vue` |
| Export du dossier | Done | même composant, `i18n/locales/operations/{fr,en}.json` |
| Tests | Done | `test/nuxt/marketplace-disputes-workspace.test.ts` |

## Important design decisions

- Le panel ne décide pas de la sécurité : il reflète `statutAnalyse` et `purgeeLe`. Le backend refuse de toute façon de servir une pièce illisible (423, 403, 410).
- `non_analysee` reste téléchargeable côté panel : le backend l'accepte quand l'analyse est désactivée et le refuse sinon. Dupliquer cette règle ici l'aurait fait diverger de la configuration réelle.

## Verification performed

- `bunx oxlint` et `bunx oxfmt --check` sur les fichiers modifiés : réussis.
- `bun run i18n:check` : réussi.
- `bun run typecheck` : réussi.
- `test/nuxt/marketplace-disputes-workspace.test.ts` : 3 tests réussis (pièces bloquées non cliquables, export par la direction, bouton absent pour le comptoir).
- Backend : `pnpm recette:fichiers` réussi sur `katihub_recette`. Il rejoue dépôt chiffré, fichier infecté refusé avec alerte, quarantaine puis analyse différée, export vérifié par empreintes, rotation des clés et purge.

## Not verified

- Rendu navigateur de l'écran avec des pièces bloquées : couvert par le test Nuxt uniquement.
