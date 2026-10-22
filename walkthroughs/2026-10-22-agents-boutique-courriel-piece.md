# Walkthrough — Agents de boutique : e-mail et pièce d'identité

## Résultat

- Espace vendeur, « Ajouter un agent » : nom, téléphone, **adresse e-mail (obligatoire)** et **n° de pièce d'identité (facultatif)**, avec la mention que la pièce n'est visible que de la boutique et de l'équipe de vérification. La liste des agents affiche l'e-mail et la pièce.
- Panel, Opérations → Agents boutiques : chaque agent montre son e-mail et « Pièce n° … » quand ils ont été donnés.
- Backend : migration `20261022200000_agents_courriel_piece_identite` (avec `rollback.sql`), DTO validé (e-mail en minuscules, pièce en majuscules, lettres/chiffres/espaces/tirets), refus lisible d'un téléphone ou d'un e-mail déjà utilisé dans la boutique.

## Vérifications

- Backend : `livraisons-agents.spec.ts` — 4 tests ; suite livraisons 32/32. Migration appliquée sur la base locale, rollback exécuté puis migration réappliquée.
- Admin : `shop-agents-workspace.test.ts` — 3/3, dont le nouvel affichage ; oxlint et oxfmt sur les fichiers modifiés.
- Vitrine : types et lint ; essai réel dans le navigateur — agent créé avec e-mail et pièce, doublon d'e-mail refusé avec message, envoi bloqué sans e-mail, aucune erreur JavaScript. L'agent de test a été supprimé ensuite.

## Limites

- Les agents créés avant cette évolution n'ont pas d'e-mail : la boutique ne peut pas encore le compléter après coup (pas d'écran de modification d'agent).
