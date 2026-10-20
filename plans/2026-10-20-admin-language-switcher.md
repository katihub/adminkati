# Plan — Sélecteur de langue global dans l’administration

## Objectif

Rendre le choix Français / English directement visible dans l’en-tête de toutes les pages du tableau de bord, avec un contrôle discret et accessible. Réutiliser le sélecteur, le routage localisé et la préférence persistée déjà en place; ne pas créer un deuxième mécanisme de langue.

## Réutilisation et état existant

- `app/components/LanguageSwitcher.vue` fournit déjà le menu, les libellés traduits, les attributs de test, `useSwitchLocalePath()` et l’écriture de `NT-LANG` dans `localStorage`.
- `app/plugins/i18n-storage.client.ts` restaure et suit `NT-LANG`; `nuxt.config.ts` configure `en`/`fr`, `prefix_except_default`, le cookie `NT-LANG` et les routes localisées.
- `app/components/admin/AdminHeader.vue` est l’en-tête partagé du shell authentifié. Il contient la navigation et `AdminProfileMenu`.
- Le sélecteur est actuellement dans le menu de profil (`AdminProfileMenu.vue`). `app/app.vue` laisse le sélecteur flottant sur les pages hors shell admin et le masque dans le shell admin; la page de connexion conserve son contrôle.
- Les traductions English/Français sont intégrées au composant; les fichiers common possèdent aussi des libellés de langue. Ne pas ajouter de troisième source de traduction.

## Contrats, états et hypothèses

- Contrat inchangé : codes supportés `en` et `fr`; sélection = navigation vers la même route dans l’autre langue via `useSwitchLocalePath`, et préférence = `NT-LANG`.
- Pas d’appel API, de changement de données métier ni de nouvel état réseau. Le déclencheur reflète la langue active; le menu expose les deux choix et le choix courant est sans effet de navigation.
- Hypothèse : « toutes les interfaces » désigne ici l’ensemble des pages du shell d’administration couvert par ce dépôt. Les autres dépôts frontend auront leur propre plan et implémentation.
- Choix visuel : reprendre le contrôle existant (drapeau + nom de langue dans un petit bouton) dans la rangée d’actions de l’en-tête, entre navigation et profil, sans élargir le menu de navigation.

## Phases

### 1. Couvrir le comportement global et les parcours existants

- **Changements :** faire évoluer les tests de shell et de profil pour spécifier que le sélecteur est directement présent et accessible dans l’en-tête de chaque route admin testée, et qu’il n’est plus dupliqué dans le menu profil. Ajouter un cas de changement de langue depuis une route admin localisée avec query (et hash si le routeur de test le permet), puis vérifier la route équivalente, le texte actif et `NT-LANG`. Garder la couverture du sélecteur sur la connexion.
- **Fichiers :** `test/nuxt/admin-shell.test.ts`, `test/nuxt/admin-profile-menu.test.ts`, `test/nuxt/language-switcher.test.ts` (et `test/nuxt/app-initialization.test.ts` seulement si nécessaire pour vérifier la connexion).
- **Terminé quand :** les assertions prouvent accès direct depuis le shell, absence de doublon dans le profil, navigation vers la page équivalente (ex. `/fr/produits` ↔ `/products`), conservation des paramètres pertinents, et sauvegarde `NT-LANG`; les tests concernés échouent avant le changement d’interface pour les raisons attendues.

### 2. Placer le contrôle dans l’en-tête commun

- **Changements :** insérer le `LanguageSwitcher` existant dans `AdminHeader.vue` dans une position constante et responsive; retirer son instance de `AdminProfileMenu.vue` pour éviter deux commandes identiques. Ne pas modifier la visibilité globale de `app.vue` ni le plugin de persistance.
- **Fichiers :** `app/components/admin/AdminHeader.vue`, `app/components/admin/AdminProfileMenu.vue`.
- **Terminé quand :** toutes les routes du shell rendent un seul bouton repérable par son libellé accessible, utilisable au clavier; le changement de langue conserve la page courante et met à jour la préférence, et les pages publiques continuent d’avoir leur sélecteur.

## Tests de validation

- Component tests ciblés : `bunx vitest run test/nuxt/admin-shell.test.ts test/nuxt/admin-profile-menu.test.ts test/nuxt/language-switcher.test.ts test/nuxt/app-initialization.test.ts`.
- Vérifier le sélecteur sur une route admin en anglais et en français, la navigation d’une route personnalisée (produits), une route avec query conservée, puis les deux locales dans `NT-LANG`.
- Vérifier l’accessibilité par nom accessible et interaction clavier; vérifier qu’il n’existe qu’un seul déclencheur dans le shell et que le profil ne le duplique plus.
- Gates du dépôt après implémentation : `bun run i18n:check`, `bun run typecheck`, `bun run lint`, puis `bun run format:check` sur le diff concerné.

## Risques et détection précoce

- Le responsive de l’en-tête est serré aux petites largeurs : le déclencheur doit rester visible sans faire déborder la navigation ni réduire l’action profil sous sa zone cible; valider mobile et desktop au cours de l’implémentation.
- `useSwitchLocalePath()` doit garder la route localisée courante et ses query; le test de route personnalisée avec query le confirme avant de considérer le contrôle fini. Si le hash n’est pas conservé par le helper ou le routeur, le noter explicitement plutôt que reconstruire une URL à la main.
- Le sélecteur du profil a déjà un test de persistance. Son déplacement peut invalider les sélecteurs de test actuels; les assertions doivent cibler l’en-tête et préserver le test de persistance fonctionnel, sans tester le détail interne du menu.
- `NT-LANG` est lu au démarrage côté client et le sélecteur effectue aussi une écriture directe. Ne pas introduire une autre clé ou une préférence serveur concurrente.

## Questions ouvertes

- Aucune pour le périmètre `adminkati`; le libellé du demandeur « bouton discret mais visible » est satisfait par le petit bouton existant du composant partagé.
