# Walkthrough — fichiers des justificatifs vendeur

Plan : `plans/2026-10-15-seller-document-files.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Types | fait | `app/types/api/marketplace-moderation.ts` (`nomFichier`, `typeMime`, `tailleOctets`, `statutAnalyse`) |
| 2. Écran | fait | `app/components/operations/SellerOnboardingWorkspace.vue` (`openDocument`, bouton `seller-document-open-*`), `i18n/locales/operations/*.json` (`onboarding.openFile`, `scanClean`, `legacyKey`) |
| 3. Tests | fait | `test/nuxt/seller-onboarding-documents.test.ts` |

## Écarts par rapport au plan

Aucun. Le téléchargement reprend `downloadBlob`, comme pour les pièces de litige.

## Tests exécutés

```
bunx vitest run --project nuxt test/nuxt/seller-onboarding-documents.test.ts
      Tests  1 passed (1)
bun run typecheck   → aucune erreur
bunx oxlint         → aucun nouvel avertissement
bun run i18n:check  → ok
```

## Notes pour le relecteur

- Une erreur d'ouverture (document sans fichier, fichier bloqué, stockage indisponible) passe par `apiErrorText` dans un toast.
- Le fichier est relu à chaque ouverture et n'est jamais mis en cache côté panel : la route backend répond `Cache-Control: no-store`.
