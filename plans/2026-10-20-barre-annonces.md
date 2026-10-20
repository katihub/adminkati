# Implementation Plan — Barre d’annonces administrable

## 1. What the mockup shows

La capture présente une barre horizontale de 45 px, bleu nuit, avec trois messages d’information alignés à gauche. À droite restent la signature « En toute confiance ! » soulignée d’orange, puis les liens de connexion et d’inscription. La demande est de transformer la zone des messages en bandeau défilant automatiquement et d’en rendre le contenu administrable depuis le tableau de bord super admin.

### Structure

- **M1** — Barre pleine largeur en haut de la page, une seule rangée de faible hauteur.
- **M2** — Zone gauche occupant l’espace flexible et contenant trois annonces séparées par de larges espacements.
- **M3** — Zone droite avec signature de marque et deux liens de compte.

### Composants, typographie, couleurs et dimensions

- **M4** — Fond bleu nuit uniforme, texte et petits pictogrammes blancs.
- **M5** — Annonces compactes sur une ligne ; signature de marque en italique, avec soulignement orange.
- **M6** — Barre d’environ 45 px de hauteur dans la capture (1900 px de largeur) ; aucun autre point de rupture n’est montré.

### Contenu et interaction

- **M7** — Textes visibles : « Livraison rapide partout au Cameroun », « Paiement sécurisé », « Une équipe à votre écoute 24/7 », « En toute confiance ! », « Se connecter », « Créer un compte ».
- **M8** — Aucun contrôle d’animation ni formulaire n’est visible dans la capture actuelle.
- **M9** — La capture ne montre ni états de chargement/erreur, ni petit écran, ni préférence de mouvement réduit.

Intention : faire circuler les annonces dans la partie gauche de la barre sans déplacer la signature de marque ni les liens de compte, et permettre à la direction de modifier les annonces sans redéployer le site.

## 2. What the requirement asks for

- **R1 — Explicit** : les informations de la barre défilent automatiquement.
- **R2 — Explicit** : depuis le tableau de bord super admin, une personne autorisée peut ajouter une annonce.
- **R3 — Explicit** : depuis le tableau de bord super admin, une personne autorisée peut modifier une annonce.
- **R4* — Implied** : les annonces administrées sont persistées et seules les annonces actives sont publiées sur la vitrine.
- **R5* — Implied** : l’ordre de défilement est déterministe et administrable ; une annonce peut être désactivée sans être perdue.
- **R6* — Implied** : l’animation peut être suspendue et respecte la préférence de mouvement réduit.
- **R7* — Implied** : les valeurs initiales de la barre actuelle restent présentes et éditables après mise en service.
- **R8* — Implied** : les liens de marque et de compte présents à droite restent fixes et utilisables.

## 3. Mapping

| ID | Élément | Requirement | Verdict | Note |
| :-- | :-- | :-- | :-- | :-- |
| M1 | Barre supérieure pleine largeur | R1 | MATCH | La bande animée reste dans cette barre. |
| M2 | Trois annonces à gauche | R1, R2, R3, R4*, R5*, R7* | MATCH | Les textes deviennent une liste éditoriale active ordonnée. |
| M3 | Signature et liens de compte à droite | R8* | MATCH | Ils restent statiques, hors du rail animé. |
| M4 | Palette bleu nuit et blanc | R1 | MATCH | La charte existante est conservée. |
| M5 | Texte compact sur une ligne | R1 | MATCH | Le ticker ne doit pas augmenter la hauteur de la barre. |
| M6 | Largeur desktop uniquement dans la capture | R1 | PARTIAL | Les petits écrans ne sont pas dessinés ; la barre devra s’adapter sans chevauchement. |
| M7 | Trois textes et libellés existants | R7*, R8* | MATCH | Les trois messages d’information sont initialisés en base ; marque et compte ne deviennent pas administrables. |
| M8 | Pas de contrôle d’animation montré | R6* | REQUIREMENT-ONLY | Proposer un contrôle compact pause/reprise, plus pause au survol/focus. |
| M9 | États et accessibilité non montrés | R4*–R6* | REQUIREMENT-ONLY | Prévoir chargement/erreur/fallback, liste vide, clavier et mouvement réduit. |
| — | Persistance, API et écran de gestion | R2–R5*, R7* | REQUIREMENT-ONLY | Le modèle actuel de bannières exige des fichiers image ; il ne convient pas à de simples annonces textuelles. |

## 4. Cut from the mockup

| ID | Élément | Reason for cut |
| :-- | :-- | :-- |
| — | Aucun élément visible n’est supprimé. | La signature et les liens de compte restent hors de la zone animée. |

## 5. Gaps — required but not designed

- **Ticker continu** : la capture est statique et ne précise pas le type de mouvement. Proposition : faire défiler en boucle les annonces actives, dans leur ordre, dans la zone gauche ; le contenu reste du texte non cliquable, conformément à la demande.
- **Contrôle accessible** : la capture n’en montre pas. Proposition : ajouter un bouton pause/reprise discret dans la zone d’annonces ; suspendre aussi au survol et au focus, et désactiver le mouvement si `prefers-reduced-motion` est actif.
- **Gestion** : aucun écran super admin n’est fourni. Proposition : ajouter un onglet « Annonces » à la zone existante `content.vue`, avec liste ordonnée, ajout, édition et activation/désactivation. Ne pas ajouter la suppression définitive, non demandée.
- **État vide ou API indisponible** : proposer le maintien des trois textes historiques en solution de repli côté vitrine ; la base est initialisée avec ces mêmes textes pour qu’ils soient immédiatement administrables.
- **Petit écran** : non représenté. Proposition : réduire l’espace des liens secondaires selon les règles responsive déjà en place ; éviter que le ticker recouvre la signature ou les liens compte.

## 6. Build plan

### Phase 1 — Stockage et contrat backend

- [ ] **Créer le stockage éditorial des annonces** — ajouter `vitrine.annonces` au script rejouable de vitrine, avec identifiant, texte, ordre, état actif et colonnes d’audit ; accorder les droits nécessaires à `nowtech_app` ; initialiser les trois textes actuels sans les dupliquer au rejeu.
  - Files: `BackendKati/sql/vitrine.sql`
  - Reuses: le schéma indépendant `vitrine` et les conventions d’audit de `vitrine.points_vente`.
  - Serves: R4*, R5*, R7*.
  - Done when: le script SQL rejoué ne crée pas de doublons et le rôle applicatif peut lire/écrire les annonces.
- [ ] **Ajouter les contrats et opérations API** — routes publiques actives et routes `administration` de lecture, ajout, modification, activation et ordre complet ; valider le texte borné et les identifiants ; protéger les écritures par `Role.direction`, comme les autres contenus du super admin ; invalider le cache vitrine après une écriture.
  - Files: `BackendKati/src/vitrine/vitrine.dto.ts`, `BackendKati/src/vitrine/vitrine.controller.ts`, `BackendKati/src/vitrine/vitrine.service.ts`, `BackendKati/src/vitrine/vitrine.service.spec.ts`, `BackendKati/src/vitrine/vitrine.controller.spec.ts`, `BackendKati/src/vitrine/vitrine.dto.spec.ts`, `BackendKati/sql/vitrine.spec.ts`
  - Reuses: `VitrineService`, `@Publique()`, `@Roles(Role.direction)`, `RevalidationVitrineService` via `prevenirVitrine()`.
  - Serves: R2–R5*, R7*.
  - Done when: tests couvrent liste publique triée/active, lecture admin incluant inactives, ajout, modification, validation, ordre et restrictions d’accès.

### Phase 2 — Édition super admin

- [ ] **Ajouter l’onglet et l’éditeur d’annonces** — compléter la zone Contenu avec liste ordonnée, ajout, édition, activation/désactivation et réordonnancement ; conserver les messages d’erreur, états chargement/vide et contrôles d’accès ; ajouter les libellés français/anglais.
  - Files: `adminkati/app/pages/content.vue`, `adminkati/app/types/api/vitrine.ts`, nouveaux schémas/composables/composants dans `adminkati/app/{schemas,composables,components/content}`, `adminkati/app/utils/api-query-keys.ts`, `adminkati/i18n/locales/content/fr.json`, `adminkati/i18n/locales/content/en.json`, tests Vitest correspondants.
  - Reuses: onglets et TanStack Query de `content.vue`, `useBanniereMutations`, `usePointsVente`, patterns de formulaire et de réordonnancement de `BannerGroup.vue`/`Workspace.vue`.
  - Serves: R2–R5*.
  - Done when: direction peut créer, éditer, activer/désactiver et ordonner ; le comptoir peut consulter si le comportement suit l’écran Contenu, mais ne peut pas écrire ; FR/EN restent paritaires.

### Phase 3 — Bandeau animé de la vitrine

- [ ] **Charger les annonces publiées côté serveur** — ajouter un lecteur typé et tolérant aux erreurs avec revalidation, puis le brancher au header existant.
  - Files: `websitekati/src/lib/announcements.ts`, `websitekati/src/components/marketplace/KatiHeader.tsx`.
  - Reuses: le lecteur côté serveur `src/lib/banners.ts`, l’URL API centralisée et les conventions de cache/récupération de la vitrine.
  - Serves: R1, R4*, R7*.
  - Done when: les annonces publiées de l’API remplacent les valeurs initiales ; en cas d’API vide/indisponible, les trois textes historiques restent visibles.
- [ ] **Rendre le ticker continu, accessible et responsive** — extraire un composant client dédié pour faire défiler la liste en boucle dans la zone gauche, dupliquer la piste visuellement sans dupliquer le texte pour lecteurs d’écran, ajouter pause/reprise et gérer mouvement réduit ; préserver la signature et les liens à droite.
  - Files: `websitekati/src/components/marketplace/KatiAnnouncementTicker.tsx`, un CSS module dédié et `websitekati/src/components/marketplace/marketplace-shell-v2.module.css`.
  - Reuses: `KatiHeader`, les variables et breakpoints existants de `marketplace-shell-v2.module.css`.
  - Serves: R1, R6*, R8*.
  - Done when: plusieurs annonces défilent sans saut visible ; pause/reprise fonctionne au clavier et au pointeur ; aucun chevauchement à 1900 px, desktop, tablette ou téléphone.

## 7. Data contracts

**Nouveau stockage** : `vitrine.annonces(id, texte, ordre, active, creee_le, modifiee_le, modifiee_par)`. Le script actuel n’a pas de table d’annonces ; `vitrine.bannieres` ne convient pas car il exige un fichier image.

**Nouvelles routes, actuellement absentes** :

- `GET /v1/vitrine/annonces` — tableau public des `{ id, texte, ordre }` actifs, triés par ordre.
- `GET /v1/vitrine/administration/annonces` — toutes les annonces, actives ou non, avec champs d’audit.
- `POST /v1/vitrine/administration/annonces` — `{ texte, active? }`; l’ordre est ajouté en fin de liste.
- `PATCH /v1/vitrine/administration/annonces/:id` — `{ texte?, active?, ordre? }`.
- `POST /v1/vitrine/administration/annonces/reordonner` — `{ ids: number[] }`, liste complète attendue.

Toutes les routes sont proposées, pas encore implémentées. Le texte est trimé, non vide, borné (recommandation : 120 caractères). Le client admin utilise `direction` pour écrire, comme les contenus éditoriaux existants. Le storefront lit la route publique sans session ; seuls les enregistrements actifs en sortent.

## 8. Test plan

- Backend : valider DDL rejouable/droits, règles DTO, ordre et filtrage public, toutes les mutations, refus d’identifiants/ordres incomplets et gardes de rôle.
- Admin : tester chargement, vide, erreur, ajout/édition, activation et réordonnancement ; vérifier la parité des clés i18n.
- Vitrine : test navigateur avec quatre annonces, mouvement automatique, pause/reprise, mouvement réduit, API indisponible et écran étroit ; vérifier que les contrôles de compte restent accessibles.
- Exécuter les commandes documentées des trois projets (`bun run lint/typecheck/test` dans admin, tests backend concernés, scripts frontend documentés) sans installer de dépendance.

## 9. Risks

- **Cache** : le texte pourrait rester ancien côté Next si les écritures n’invalident pas le cache ; raccorder la nouvelle clé de revalidation et couvrir ce chemin avant l’écran admin.
- **Initialisation SQL** : le fichier est rejoué plutôt qu’exécuté comme une migration Prisma ; grants et seed doivent être idempotents sur base neuve et existante.
- **Accessibilité du mouvement** : une animation sans pause clavier et sans respect de `prefers-reduced-motion` est une régression ; la pause est dans le périmètre, pas une finition optionnelle.
- **Largeur limitée** : les liens compte prennent une partie significative de la barre sur téléphone ; tester tôt le vrai point de rupture et réduire le ticker avant les actions statiques.
- **Déploiement indépendant** : API et storefront peuvent être déployés dans des ordres différents ; conserver les valeurs de repli dans la vitrine et rendre l’absence de la table lisible pendant la mise en service.

## 10. Needs a decision

1. **Mode de défilement** — la capture ne permet pas de distinguer ticker continu et message remplacé à intervalle. Recommandation retenue : ticker continu horizontal dans la zone gauche, puisque plusieurs annonces sont visibles simultanément dans la référence ; si l’intention était un fondu/une annonce à la fois, le composant devra changer.
2. **Contenu cliquable** — aucun lien n’est demandé ni montré. Recommandation : annonces en texte simple, sans destination, pour éviter liens erronés et nouveaux champs non sollicités.
