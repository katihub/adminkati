# Walkthrough — Rebranding transversal KatiHub

## Ce qui a été construit

- Une source de marque unique dans `brand.config.ts` pour le nom public, le nom de l'administration, le nom de l'assistant, le mot-symbole, le logo et l'URL de la vitrine.
- Un `BrandWordmark` alimenté par cette configuration et par le logo officiel KatiHub.
- Le titre du site, le favicon et l'URL de vitrine Nuxt alimentés par la même source.
- Le remplacement des mentions publiques NowTech par KatiHub dans les traductions françaises et anglaises, les métadonnées, l'authentification, les écrans métier et l'assistant IA.
- Le renommage technique du package frontend en `katihub-admin`.
- La palette officielle KatiHub centralisée dans le même contrat : marine `#08265c` et orange `#ff7900`.
- Les tokens shadcn/Tailwind, graphiques, états positifs, navigation et surfaces statistiques débarrassés du vert historique.

## Couverture du plan

| Étape | Résultat |
| --- | --- |
| Inventorier les surfaces de marque | Terminé — rapport d'audit conservé dans `reports/2026-10-15-audit-katihub-nowtech-brand-collision.md`. |
| Centraliser la marque | Terminé — `brand.config.ts` est la source commune. |
| Refaire le mot-symbole et les métadonnées | Terminé — composant partagé, titre du site et favicon KatiHub. |
| Rebrand des textes FR/EN | Terminé — aucune mention NowTech dans les textes rendus ou les fichiers i18n. |
| Verrouiller par des tests | Terminé — tests de configuration, mot-symbole, métadonnées et assistant IA. |
| Vérifier le rendu | Terminé — desktop 1440×900 et mobile 390×844, navigation vers le mot de passe oublié et console navigateur. |

## Validation

- Tests ciblés : 58 tests passés dans 4 fichiers.
- Tests palette et surfaces associées : 122 tests passés dans 8 fichiers.
- `bun run i18n:check` : passé.
- `bun run typecheck` : passé.
- `bun run lint` : passé, avec 2 avertissements préexistants sans rapport avec ce changement.
- `bun run fallow` : passé, aucun problème dans 180 fichiers modifiés analysés.
- `bun run build` : passé, build Nitro terminé.
- Vérification HTML locale : HTTP 200, favicon `/katihub-logo-official.png`, 16 occurrences de KatiHub, 0 de NowTech.
- Vérification navigateur : aucune erreur applicative, mot-symbole KATIHUB visible et parcours « Mot de passe oublié » fonctionnel.
- Vérification palette : `primary` et `success` calculés à `#ff7900`, bandeau statistique à `#08265c`, aucune classe `emerald-*` ou `teal-*` dans les surfaces applicatives.
- `git diff --check` : passé ; seuls des avertissements de conversion LF/CRLF sont signalés par Git sous Windows.

## Écarts et décisions

- Aucun domaine KatiHub n'a été inventé : `storefrontUrl` reste vide et peut être remplacée par `NUXT_PUBLIC_STOREFRONT_URL` selon l'environnement.
- Les références `NowTech-backend-`, `nowtech.*` et l'ancienne URL backend dans les commentaires techniques sont conservées : elles documentent des chemins de dépôt, schémas SQL et contrats backend existants, et ne sont jamais affichées à l'utilisateur.
- Le plugin Browser n'était pas disponible. La QA navigateur a été exécutée avec Playwright déjà installé dans le workspace adjacent, conformément au fallback prévu.
- Les seules erreurs console observées pendant la QA palette viennent du script Vercel Analytics bloqué par l'accès réseau du navigateur headless ; aucun code applicatif n'est concerné.
- Le contrôle de format global reste rouge sur 771 fichiers préexistants. Le contrôle ciblé de tous les fichiers touchés par cette implémentation est vert.

## Non couvert

- Les écrans nécessitant un compte administrateur réel n'ont pas été parcourus en session authentifiée. Leur vocabulaire est néanmoins couvert par le scan i18n et les tests automatisés.
- Une URL publique de vitrine KatiHub devra être fournie par environnement avant déploiement si le lien externe doit être actif.

## Note de maintenance

Le logo officiel source pèse environ 1,2 Mo. `NuxtImg` l'optimise dans le mot-symbole ; le favicon pointe sur le PNG original. Une déclinaison favicon dédiée et plus légère pourra être ajoutée plus tard sans modifier l'API de marque.
