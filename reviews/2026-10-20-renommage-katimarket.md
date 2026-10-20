# Review — Renommage visible KatiMarket

## Verdict

Le renommage est appliqué dans les chaînes d’interface et sorties utilisateur attendues. Les contrats techniques explicitement protégés restent présents. Je recommande de revalider l’E2E vitrine sur un serveur isolé : le runner sert encore l’ancien titre alors que le build a réussi.

- MAJOR: 0 · MEDIUM: 1 · MINOR: 0 · INT: 2
- Tests : vitrine typecheck/build/QA 3/3 passés ; admin i18n et lint passés, 7 tests ciblés passés ; backend ciblé 48 tests passés selon la revue (21 tests courriel/vérification/PDF plus tests d’assistance).

## Fidélité au plan

| Élément | Verdict | Preuve |
| :-- | :-- | :-- |
| Nom, mot-symbole, titres, favicon admin | DONE | `brand.config.ts`, `app/components/BrandWordmark.vue`, `public/katimarket-mark.svg`, `nuxt.config.ts` |
| Traductions visibles admin FR/EN | DONE | `i18n/locales/**/{fr,en}.json`; `i18n:check` réussit |
| Vitrine, métadonnées, parcours client/vendeur et icônes | DONE | `src/app/layout.tsx`, `src/components/marketplace/KatiLogo.tsx`, `src/app/icon.png`, `src/app/apple-icon.png` |
| Emails, messages, documents backend | DONE | `src/courriel/courriel.service.ts`, `src/profil/verification-courriel.service.ts`, `src/assistant/**`, `src/marketplace/devis/devis-pdf.ts`, `src/marketplace/finance/finance-vendeur.service.ts` |
| Préservation des identifiants/domaines | DONE | `katihub.cm`, `katihub` (enum/mode), clés locales historiques et `categoriesKatiHub` restent en place |
| Raison sociale Kati Hub SARL | PARTIAL | Aucune sortie de l’application ne contenait cette raison sociale ; elle n’a pas été introduite ou modifiée. |
| QA navigateur de la vitrine | PARTIAL | L’E2E échoue sur bureau et mobile car il reçoit un ancien titre depuis le serveur local malgré un build réussi. |

**Exactitude du walkthrough :** fidèle aux changements et aux limites relevées. Le rapport ajoute que la validation navigateur reste à refaire après isolation des anciens serveurs locaux.

## Constatations

### MEDIUM

**1. L’E2E de marque ne confirme pas le rendu de la vitrine**
- Où : `websitekati/e2e/branding.spec.ts:11`
- Axe : Tests / UI-UX
- Problème : le test reçoit `KatiHub — vos boutiques locales au même endroit` et échoue sur bureau et mobile. Le HTML produit lors du build contenait KatiMarket, mais des processus Next préexistants écoutaient sur les ports de test et le contenu servi ne reflétait pas la source actuelle.
- Échec concret : une exécution de contrôle de marque ne peut pas distinguer un défaut de code d’un artefact/processus local obsolète.
- Suite : relancer `npm.cmd run e2e -- e2e/branding.spec.ts` dans un environnement sans serveur préexistant ; ne pas affaiblir l’assertion de marque.

### INT

- L’asset de lockup KatiHub reste présent dans `public/`, mais le code actif de la vitrine et l’admin n’y fait plus référence. Les images de campagne téléversées peuvent aussi contenir l’ancien nom dans leurs pixels et restent éditoriales.
- `Kati Hub SARL` n’apparaît dans aucune sortie source vérifiée ; sa conservation est donc une exclusion explicite du renommage, pas une assertion runtime testée.

## Axes propres

Sécurité, logique de données, performance et accessibilité du code modifié : aucun changement de contrat/API ou de flux métier n’a été observé. Les clés de stockage/domaines sont inchangés.
