# Review — Sélecteur de langue global dans l’administration

## Verdict

Le déplacement du sélecteur dans l’en-tête partagé est limité et cohérent; les tests du shell et du profil passent. Le changement n’est toutefois pas prêt à valider : le test censé prouver la navigation entre locales reste rouge. Les éléments observés suggèrent une limite de simulation de l’interaction dans le test, pas un défaut démontré du sélecteur en production, mais le comportement demandé n’est donc pas vérifié.

- MAJOR: 0 · MEDIUM: 1 · MINOR: 0 · INT: 1
- Tests: `bunx vitest run test/nuxt/language-switcher.test.ts --reporter=verbose` → 1 passé, 1 échoué; `bunx vitest run test/nuxt/admin-shell.test.ts test/nuxt/admin-profile-menu.test.ts --reporter=dot` → terminé avec code 0. Les essais Nuxt ont aussi signalé l’impossibilité de télécharger les polices/icônes externes (EACCES).

## Plan fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| Rendre le sélecteur existant visible dans l’en-tête partagé des pages admin | DONE | `app/components/admin/AdminHeader.vue:22` |
| Retirer le doublon du menu de profil | DONE | `app/components/admin/AdminProfileMenu.vue:78` et `test/nuxt/admin-profile-menu.test.ts` |
| Garder un contrôle accessible et localisé selon la langue active | DONE | `app/components/LanguageSwitcher.vue:47`; `test/nuxt/admin-shell.test.ts` vérifie les noms accessibles « Language »/« Langue » |
| Changer de langue depuis une route admin et conserver route/query ainsi que `NT-LANG` | PARTIAL | `test/nuxt/language-switcher.test.ts:50` échoue avant les assertions query et stockage; la route courante reste `/products` |
| Valider l’en-tête aux formats mobile et desktop | PARTIAL | Le plan l’identifie comme risque à valider, mais ni walkthrough ni tests ciblés ne donnent de résultat responsive. Le code utilise la navigation compacte déjà existante sous `xl`; aucun débordement concret n’a été établi ici. |

**Walkthrough accuracy:** Les éléments « header » et « absence de doublon » correspondent au diff. Le walkthrough qualifie le test de cas où le handler résout l’URL cible, mais le test ne l’observe pas : il envoie un `keydown` synthétique à l’option et n’espionne ni `switchLocalePath` ni `router.push`. Il constate uniquement que la route n’a pas changé. La cause attribuée n’est donc pas prouvée par le test.

## Findings

### MAJOR

Aucun.

### MEDIUM

**1. Le test de changement de langue ne simule pas de façon fiable la sélection du menu et laisse le contrat principal sans vérification réussie.**
- Where: `test/nuxt/language-switcher.test.ts:45`
- Axis: Tests
- Problem: Après ouverture du menu, le test récupère l’option puis lui envoie directement un `KeyboardEvent("keydown")`. Cette injection DOM ne reproduit pas nécessairement le focus et le cycle de sélection gérés par Reka UI. L’échec observé (`currentRoute` vaut toujours `/products`) ne permet donc pas de conclure que l’action `switchLanguage` a été exécutée et que la navigation de production est cassée. Le composant déplacé est le sélecteur préexistant, dont `switchLanguage` appelle toujours `router.push(switchLocalePath(code))`; aucun changement à cette logique n’apparaît dans le diff.
- Failure: Dans le test ciblé exécuté, l’assertion attend `/fr/produits` et reçoit `/products`; query, libellé actif et `NT-LANG` ne sont jamais vérifiés. Le scénario peut échouer parce que l’événement synthétique n’a pas déclenché `select`, même si l’interaction utilisateur réelle fonctionne.
- Fix: Remplacer l’événement synthétique par une activation réellement supportée par le harnais (par exemple l’événement `select` de l’item ou un test de composant avec routeur contrôlé et assertion sur `router.push`), puis conserver un test distinct qui valide la navigation localisée dans le routeur Nuxt. Ne considérer le changement de route comme vérifié qu’une fois cette assertion passée.

### MINOR

Aucun.

### INT

**1. Le sélecteur reste le composant partagé existant; le diff de production ne modifie que son emplacement.**
- Where: `app/components/admin/AdminHeader.vue:22`
- Axis: Code quality
- Observation: La navigation compacte reste rendue par `AdminNavigation` sous `xl`; le bouton de langue se trouve dans le groupe d’actions du profil. Le rendu à petite largeur n’a pas été vérifié visuellement dans cette revue.

## Clean axes

Sécurité, logique/correction (hors vérification de navigation relevée ci-dessus), performance et qualité du code n’ont pas révélé d’autre problème dans le diff examiné. L’axe UI/UX est couvert par la présence et le nom accessible du bouton; la vérification responsive reste partielle comme indiqué au tableau de fidélité.
