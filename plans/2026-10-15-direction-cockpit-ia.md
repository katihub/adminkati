# Implementation Plan — Cockpit Direction et navigation métier KatiHub

## 0. Résultat de ce premier incrément

Transformer la page d’accueil actuelle en cockpit de Direction réellement exploitable, sans attendre un nouveau
backend et sans accélérer à l’aveugle l’architecture existante. L’incrément livre quatre changements cohérents :

1. un modèle documenté des responsabilités, files de travail, priorités et cibles de service ;
2. une navigation métier KatiHub qui réemploie les routes et onglets existants ;
3. un cockpit Direction composé uniquement à partir de `ApiStatistiquesApercu.marketplace` ;
4. un feedback immédiat de navigation et le chargement paresseux des espaces de la page Opérations.

La source visuelle acceptée est
`C:\Users\Rufus\.codex\generated_images\01a13f65-b4c6-79c1-ba8c-f5734d6ac404\exec-e52ac362-4ff1-42ab-9f27-3d53f99920cc.png`
(1536 × 1024). Elle fixe la hiérarchie, la densité, la navigation horizontale et la palette, mais ses chiffres de
démonstration ne constituent pas un contrat de données.

Le dépôt contient déjà des modifications non commitées de rebranding, notamment `brand.config.ts`,
`app/assets/css/main.css`, plusieurs composants statistiques et `app/pages/index.vue`. L’implémentation doit partir
de leur état courant, limiter les recouvrements et ne jamais les rétablir à `HEAD`.

## 1. Ce que montre le concept

Le concept présente un poste de pilotage quotidien destiné à la Direction : les travaux à décider occupent la zone
principale, la santé de la marketplace reste visible à droite, puis le flux, les anomalies et les raccourcis complètent
la lecture. L’interface est une surface de décision et non une accumulation de graphiques. Elle n’emploie que le bleu
marine KatiHub, l’orange de marque et des couleurs sémantiques rouge/ambre/bleu ; aucun vert n’y apparaît.

### Structure et composants

- **M1 — En-tête global :** mot-symbole KatiHub à gauche, neuf destinations métier horizontales, état actif orange,
  notification et identité Direction à droite.
- **M2 — Introduction :** titre « Pilotage », sous-titre « Ce qui demande votre attention aujourd’hui » et sélecteur
  de période aligné à droite.
- **M3 — Travaux prioritaires :** grand tableau à six colonnes (type, nombre, sévérité, âge/SLA, responsable,
  action), avec cinq lignes actionnables et un lien vers la file complète.
- **M4 — Santé de la marketplace :** panneau vertical de cinq indicateurs, chacun avec valeur, variation et période de
  comparaison.
- **M5 — Flux opérationnel :** chaîne horizontale Commandes → Paiements → Préparation → Expédition → Livraison,
  chaque étape affichant volume et progression.
- **M6 — Anomalies récentes :** tableau horodaté avec type, référence, statut et action de consultation.
- **M7 — Actions rapides :** rail de six raccourcis reprenant les principales files de Direction.
- **M8 — Navigation métier :** Pilotage, Commerce, Catalogue, Vendeurs, Clients, Logistique, Finance, Marketing,
  Administration.

### Typographie, surfaces et couleur

- **M9 — Hiérarchie typographique :** titres bleu marine très contrastés, labels compacts, nombres en graisse forte,
  textes secondaires bleus/gris ; contrôles et tableaux restent denses mais lisibles.
- **M10 — Surfaces :** fond blanc, panneaux blancs bordés de gris clair, rayons modérés et presque aucune ombre ; la
  grille est plus proche d’un outil de travail que d’un ensemble de cartes décoratives.
- **M11 — Palette :** bleu marine `#08265c`, orange `#ff7900`, rouge pour critique, ambre pour attention et bleu clair
  pour information/variation favorable. Le vert est absent, y compris pour les états positifs.
- **M12 — Iconographie :** pictogrammes linéaires cohérents (commerce, boutique, étiquette, alerte, paiement,
  livraison) et chevrons pour les actions.

### Contenu, interaction et états

- **M13 — Données de démonstration :** valeurs telles que « 12 commandes à risque », « 36 500 FCFA de panier
  moyen », âges, références et variations « vs hier ».
- **M14 — Interactions :** chaque file et action rapide ouvre directement son espace de traitement ; le sélecteur de
  période actualise la santé et le flux.
- **M15 — États montrés :** seulement un écran desktop alimenté. Aucun chargement, vide, erreur, données partielles,
  navigation lente, mobile ou mode sombre n’est dessiné.
- **M16 — Accessibilité à compléter :** plusieurs états reposent sur la couleur, les petits boutons peuvent tomber
  sous 44 px et les icônes d’information nécessitent un libellé accessible.

## 2. Ce que demande le besoin

- **R1 — Explicite :** identifier les utilisateurs internes et documenter leurs responsabilités réelles.
- **R2 — Explicite :** documenter les décisions, tâches quotidiennes et files opérationnelles de chaque domaine.
- **R3 — Explicite :** définir une priorité, un responsable et une cible de service pour les files du cockpit.
- **R4 — Explicite :** remplacer la navigation par Pilotage, Commerce, Catalogue, Vendeurs, Clients, Logistique,
  Finance, Marketing et Administration.
- **R5 — Explicite :** faire pointer cette navigation vers les routes et onglets qui existent déjà.
- **R6 — Explicite :** réorganiser le cockpit Direction autour des files prioritaires et de la santé marketplace.
- **R7 — Explicite :** construire le cockpit uniquement à partir de `ApiStatistiquesApercu.marketplace`, sans fausse
  métrique ni fausse ligne opérationnelle.
- **R8 — Explicite :** respecter la charte KatiHub bleu marine/orange et ne rendre aucun vert dans les nouvelles
  surfaces.
- **R9 — Explicite :** donner un feedback immédiat lorsqu’une navigation ou un espace est en cours de chargement.
- **R10 — Explicite :** charger paresseusement les espaces Opérations si le découpage Nuxt le permet dans ce même
  incrément.
- **R11* — Impliqué :** conserver les permissions réelles `direction`, `comptoir`, `preparation`, `livreur` ; les
  domaines métier sont des responsabilités, pas de nouveaux rôles d’autorisation.
- **R12* — Impliqué :** conserver l’i18n, les URLs françaises/anglaises et tous les deep links existants.
- **R13* — Impliqué :** couvrir chargement, vide, erreur et réponse partielle pour chaque surface asynchrone.
- **R14* — Impliqué :** préserver le tableau de bord générique actuel lorsque le backend ne renvoie pas le bloc
  `marketplace` (ancien déploiement ou rôle non-Direction).
- **R15* — Impliqué :** vérifier par le bundle et le navigateur que l’espace Opérations inactif n’est plus chargé au
  premier affichage.

## 3. Mapping concept → besoin

| ID | Élément | Besoin | Verdict | Ajustement retenu |
| :-- | :-- | :-- | :-- | :-- |
| M1 | En-tête global | R4, R5, R8, R11 | PARTIAL | Réutiliser `AdminHeader`, `AdminNavigation`, `BrandWordmark` et le vrai profil ; ne pas inventer de compteur de notifications. |
| M2 | Titre et période | R6, R7 | MATCH | Réutiliser `AdminPageHeader` et `StatsRangePicker`; le libellé devient Pilotage. |
| M3 | Travaux prioritaires | R2, R3, R6, R7 | PARTIAL | Rendre les volumes réels ; afficher une **cible** de service de politique, jamais un âge mesuré que l’API ne fournit pas. |
| M4 | Santé marketplace | R6, R7 | PARTIAL | Utiliser seulement GMV, commandes, vendeurs actifs, produits actifs, commissions et litiges ouverts déjà présents. |
| M5 | Flux opérationnel | R6, R7 | PARTIAL | Construire le flux depuis `orderStatuses`; supprimer l’étape Paiements, absente du contrat agrégé. |
| M6 | Anomalies détaillées | R6, R7 | PARTIAL | Remplacer le faux journal par la liste agrégée `marketplace.alerts` (type, sévérité, volume, action). |
| M7 | Actions rapides | R5, R6, R7 | MATCH | Les générer depuis les mêmes définitions de files afin que libellé, volume et destination ne divergent pas. |
| M8 | Neuf domaines métier | R4, R5, R11, R12 | MATCH | Ajouter des critères actifs qui reconnaissent aussi les onglets `operations?tab=…`. |
| M9–M12 | Système visuel | R8 | MATCH | Réutiliser Manrope, Phosphor et les tokens centralisés `--brand-navy` / `--brand-orange`. |
| M13 | Chiffres du concept | R7 | MOCKUP-ONLY | Tous les chiffres non présents dans la réponse API sont supprimés. |
| M14 | Deep links et période | R5, R6, R12 | MATCH | Conserver `NuxtLinkLocale`, les query strings et la période existante. |
| M15 | États absents | R9, R10, R13, R15 | REQUIREMENT-ONLY | Ajouter skeleton, état vide, erreur de chunk et feedback de route. |
| M16 | Accessibilité | R9, R13 | PARTIAL | Renforcer focus, libellés, `aria-busy`, textes de statut et cibles tactiles. |

## 4. Éléments supprimés du concept

| ID | Élément supprimé | Motif |
| :-- | :-- | :-- |
| M1 | Badge de 12 notifications | Aucun contrat de notifications globales ne fournit ce nombre. |
| M3 | Badge total « 27 » | Additionner des files potentiellement recouvrantes produirait un total trompeur. |
| M3 | « Commandes à risque », « paiements à rapprocher » et leurs valeurs | Le payload agrégé ne fournit ni détection de risque ni file de rapprochement. |
| M3 | Âges `> 24 h`, `2–5 jours`, `> 72 h`, `1–3 jours` | Aucun timestamp par élément n’est présent dans `marketplace`; ils ne doivent pas être simulés. |
| M4 | Panier moyen, taux d’annulation et livraisons à l’heure | Ces métriques ne sont pas des champs contractuels de `MarketplaceCommandCenter` dans cet incrément. |
| M4 | Comparaisons « vs hier » | `KpiMetric.precedent` représente la fenêtre précédente de même durée, pas nécessairement hier. |
| M5 | Paiements confirmés | Aucun statut de paiement agrégé n’est disponible. |
| M6 | Heures, références et faux incidents nominatifs | `marketplace.alerts` ne fournit que `id`, `severity` et `count`. |
| M7 | « Consulter les rapports » | Aucune route de rapports n’existe dans l’administration. |
| M3/M6 | « Voir tous les travaux/anomalies » | Aucune file transversale exhaustive n’existe encore ; chaque action ouvre sa file réelle. |
| M10 | Ombres ou gradients décoratifs | Non nécessaires au besoin et absents du langage actuel KatiHub. |

## 5. Modèle opérationnel à documenter

Créer `docs/direction-cockpit-operating-model.md` comme référence métier de ce premier incrément. Le document doit
séparer clairement les **rôles techniques** existants des **domaines de responsabilité** présentés dans la navigation.

### 5.1 Responsabilités

| Domaine | Responsabilité quotidienne | Décisions principales | Accès technique actuel | Destination par défaut |
| :-- | :-- | :-- | :-- | :-- |
| Pilotage | Prioriser les files et surveiller la santé globale | Arbitrage, escalade, allocation | Toute équipe pour l’accueil ; bloc marketplace seulement lorsqu’il est renvoyé | `/` |
| Commerce | Suivre commandes et devis | Déblocage, annulation, traitement d’exception | `direction`, `comptoir`, `preparation`, `livreur` selon projection backend | `/orders` |
| Catalogue | Maintenir produits, taxonomie, offres et modération | Publier, corriger, refuser | `direction`, `comptoir`; certains onglets Direction | `/products` |
| Vendeurs | Onboarding, confiance et conformité boutique | Valider, suspendre, réhabiliter | `direction`, `comptoir`; finance Direction | `/operations?tab=seller-onboarding` |
| Clients | Annuaire, demandes, litiges et avis | Répondre, arbitrer, modérer | `direction`, `comptoir` | `/users` |
| Logistique | Paramétrer desserte, tarifs et agents | Activer zones, contrôler opérateurs | Direction pour les réglages ; exécution via commandes | `/operations?tab=delivery-fees` |
| Finance | Caisses, commissions, retraits et écarts | Acquérir, autoriser, rapprocher | Direction ; caisse aussi `comptoir` | `/operations?tab=seller-finance` |
| Marketing | Bannières, contenu et communications | Publier, ordonner, notifier | `direction`, `comptoir`; émissions sensibles Direction | `/content` |
| Administration | Équipe, pilote et conformité de plateforme | Gérer accès, configuration et clôture | Équipe pour l’annuaire ; décisions sensibles Direction | `/team` |

Ce tableau n’ajoute aucun rôle backend. Si KatiHub veut plus tard déléguer « Finance » ou « Catalogue » à des profils
distincts, ce sera une évolution RBAC séparée.

### 5.2 Files du premier incrément

Les cibles ci-dessous sont des **objectifs internes proposés**, pas des mesures calculées. La colonne visible doit
s’appeler « Cible » ou « SLA cible », jamais « Âge » ou « Hors délai » tant que le backend ne fournit pas les dates
individuelles et le décompte réellement en retard.

| File | Source réelle du volume | Priorité initiale | Responsable | Cible proposée | Deep link |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Commandes à examiner | `orderStatuses[id=attention].count` | Critique | Commerce | 4 h ouvrées | `/orders` |
| Vendeurs à valider | `approvals.sellers` | Élevée | Vendeurs | 2 jours ouvrés | `/operations?tab=seller-onboarding` |
| Produits à modérer | `approvals.products` | Élevée | Catalogue | 1 jour ouvré | `/operations?tab=marketplace-catalogue` |
| Offres à modérer | `approvals.offers` | Élevée | Catalogue | 1 jour ouvré | `/operations?tab=marketplace-catalogue` |
| Litiges ouverts | `kpis.openDisputes.valeur`, cohérent avec l’alerte `open_disputes` | Critique | Clients | 72 h | `/operations?tab=marketplace-disputes` |
| Écarts de caisse | `alerts[id=cash_disputes].count` lorsqu’elle existe | Élevée | Finance | 1 jour ouvré | `/operations` |

`pending_approvals` n’ajoute pas une septième ligne : elle recouvre les trois files d’approbation déjà détaillées.
Une file à zéro reste dans le modèle mais disparaît de la table prioritaire ; si toutes sont à zéro, le cockpit rend
un état calme « Aucun travail prioritaire ».

## 6. Gaps — requis mais non dessinés

- **Responsive :** le concept ne montre que 1536 × 1024. Proposition : tableau complet à partir de `lg`; sous `lg`,
  chaque file devient une ligne empilée avec volume, responsable, cible et action, sans défilement horizontal forcé.
- **Mode sombre :** non montré. Proposition : conserver les tokens sémantiques existants, mais vérifier que le marine
  reste distinct du fond sombre et que l’orange garde un contraste AA.
- **Bloc marketplace absent :** conserver les blocs génériques actuels plutôt que d’afficher des zéros inventés.
- **Réponse partielle :** `MarketplaceCommandCenter` est aujourd’hui requis lorsqu’il existe ; ne pas masquer un
  défaut de forme avec des valeurs par défaut. L’erreur d’API reste `ApiErrorCard`.
- **SLA mesuré :** hors contrat. Les cibles sont visibles comme politique ; âge, retard et taux de respect nécessitent
  un futur endpoint détaillé.
- **Anomalies détaillées :** hors contrat. Afficher les agrégats d’alertes actuels et leurs destinations seulement.
- **Chargement d’un chunk Opérations :** ajouter un skeleton local et un état d’erreur avec réessai ; ne pas laisser
  un espace blanc pendant l’import dynamique.
- **Navigation annulée :** si un garde de page bloque la sortie à cause d’un formulaire modifié, le feedback global
  doit s’arrêter et la boîte de confirmation existante doit rester l’autorité.

## 7. Réutilisation et architecture

- `brand.config.ts` et les variables `--brand-navy` / `--brand-orange` sont l’unique source de palette de marque.
- `AdminHeader`, `AdminNavigation`, `AdminProfileMenu`, `AdminPageHeader`, `NuxtLinkLocale` et le filtrage par rôle
  sont conservés.
- `StatsRangePicker`, `StatsAmount`, `StatsDeltaPill`, `ApiErrorCard` et la stratégie de refetch avec contenu estompé
  sont réutilisés.
- `useStatistiquesApercu` et l’unique requête `GET /v1/statistiques/apercu?periode=…` restent inchangés.
- `MarketplaceCommandCenter`, `MarketplaceKpiGrid` et `MarketplaceOperations` servent de point de migration ; éviter
  de dupliquer leurs règles de formatage et leurs liens dans plusieurs composants.
- Les composants Opérations existants restent intacts fonctionnellement ; seule leur frontière de chargement change.
- Les nouveaux composants suivent la convention en dossier, par exemple
  `app/components/stats/DirectionCockpit/DirectionCockpit.vue`.

## 8. Plan de construction

### Phase 1 — Verrouiller le modèle métier et les destinations

- [ ] **Écrire d’abord les tests du modèle de files et des destinations, puis créer le modèle pur.**
  - Ce qui change : ajouter un registre unique des deep links existants et une fonction pure qui transforme
    `MarketplaceCommandCenter` en files affichables sans inventer de volume, sans doubler `pending_approvals` et sans
    confondre cible de service et âge réel.
  - Fichiers : `test/unit/direction-cockpit.test.ts`, `test/unit/admin-navigation.test.ts`,
    `app/utils/admin-destinations.ts`, `app/utils/direction-cockpit.ts`.
  - Réutilise : `MarketplaceCommandCenter`, `MarketplaceAlertId`, `MarketplaceOrderStatus`, `Role`.
  - Sert : R2, R3, R5, R7, R11, R12.
  - Terminé quand : les tests prouvent les six sources de volume, l’absence de doublon d’approbation, les zéros, les
    liens exacts et les restrictions de rôle.

- [ ] **Documenter le modèle de responsabilités et de files.**
  - Ce qui change : consigner les tableaux des sections 5.1 et 5.2, la différence entre rôle technique et domaine,
    les cibles proposées et les données manquantes pour mesurer un SLA réel.
  - Fichier : `docs/direction-cockpit-operating-model.md`.
  - Réutilise : rôles de `app/types/session.ts`, gardes des pages et destinations du registre.
  - Sert : R1, R2, R3, R11.
  - Terminé quand : chaque domaine et chaque file visible possède un propriétaire, une décision, une source de volume
    et une destination vérifiables ; aucune responsabilité n’implique un rôle backend inexistant.

### Phase 2 — Installer la navigation métier sans casser les accès

- [ ] **Remplacer le catalogue de navigation technique par les neuf domaines métier.**
  - Ce qui change : faire évoluer `AdminNavigationItem` afin qu’un domaine puisse être actif sur plusieurs routes et
    sur un ensemble d’onglets `operations`; conserver un seul lien par domaine avec les destinations par défaut de la
    section 5.1. Pilotage pointe `/`, Commerce `/orders`, Catalogue `/products`, Vendeurs
    `/operations?tab=seller-onboarding`, Clients `/users`, Logistique `/operations?tab=delivery-fees`, Finance
    `/operations?tab=seller-finance`, Marketing `/content`, Administration `/team`.
  - Fichiers : `app/utils/admin-navigation.ts`, `app/components/admin/AdminNavigation.vue`,
    `i18n/locales/common/fr.json`, `i18n/locales/common/en.json`.
  - Réutilise : `visibleAdminNavigationItems`, `isAdminNavigationItemActive`, `NuxtLinkLocale`, Phosphor, menu mobile.
  - Sert : R4, R5, R8, R11, R12.
  - Terminé quand : un membre Direction voit les neuf domaines, les autres rôles ne voient que des destinations qu’ils
    peuvent ouvrir, et les onglets Opérations activent le bon domaine au lieu d’activer plusieurs liens.

- [ ] **Limiter le préchargement de navigation aux interactions utiles.**
  - Ce qui change : configurer les liens métier pour précharger sur interaction plutôt que déclencher en visibilité le
    chargement simultané des pages lourdes ; garder le même comportement sur le menu mobile.
  - Fichier : `app/components/admin/AdminNavigation.vue`.
  - Réutilise : capacité `prefetch-on` de `NuxtLink` transmise par `NuxtLinkLocale`.
  - Sert : R9, R15.
  - Terminé quand : le waterfall réseau initial ne précharge pas toutes les pages lourdes, mais le survol/focus d’une
    destination prépare bien sa route.

- [ ] **Adapter les tests de navigation avant l’implémentation.**
  - Ce qui change : fixer l’ordre, les libellés, la visibilité par rôle, les chemins français et l’état actif des deep
    links `operations?tab=…` sur desktop et mobile.
  - Fichier : `test/nuxt/admin-navigation.test.ts`.
  - Sert : R4, R5, R11, R12.
  - Terminé quand : les tests échouent d’abord sur l’ancienne IA, puis passent avec les neuf domaines.

### Phase 3 — Composer le cockpit Direction avec les seules données réelles

- [ ] **Créer le tableau des travaux prioritaires et ses états.**
  - Ce qui change : rendre les files non nulles issues de `buildDirectionQueues`, avec colonnes File, Volume,
    Priorité, Responsable, SLA cible et Action. Sur mobile, utiliser des lignes empilées ; à zéro, rendre l’état calme
    prévu. Chaque action est un `NuxtLinkLocale` vers le registre central.
  - Fichiers :
    `app/components/stats/DirectionPriorityQueues/DirectionPriorityQueues.vue`, traductions i18n locales du composant.
  - Réutilise : `StatsAmount` si nécessaire, Phosphor, tokens de bordure, modèle de Phase 1.
  - Sert : R2, R3, R5, R6, R7, R8, R13.
  - Terminé quand : les nombres rendus sont exactement ceux du fixture API, aucune ligne fictive n’apparaît et les
    six destinations sont cliquables.

- [ ] **Créer Santé, Flux, Alertes et Actions rapides à partir du même payload.**
  - Ce qui change : Santé affiche uniquement les six `kpis` existants et leurs fenêtres précédentes ; Flux affiche
    `submitted`, `preparing`, `shipping`, `delivered` et isole `cancelled`/`attention` comme exceptions ; Alertes rend
    `alerts` sans timestamp/référence inventés ; Actions rapides réutilise les files, libellés et liens de Phase 1.
  - Fichiers : `app/components/stats/DirectionHealth/DirectionHealth.vue`,
    `app/components/stats/DirectionOperationalFlow/DirectionOperationalFlow.vue`,
    `app/components/stats/DirectionAlerts/DirectionAlerts.vue`,
    `app/components/stats/DirectionQuickActions/DirectionQuickActions.vue`.
  - Réutilise : `KpiMetric`, `StatsDeltaPill`, `StatsAmount`, `MarketplaceOrderStatus`, `MarketplaceAlertId`.
  - Sert : R5, R6, R7, R8, R13.
  - Terminé quand : les valeurs changent avec le fixture et la période, les listes vides rendent un message explicite,
    et aucune chaîne « panier moyen », « à l’heure », référence ou heure simulée n’est présente.

- [ ] **Assembler le cockpit et conserver le fallback historique.**
  - Ce qui change : faire de `StatsMarketplaceCommandCenter` le point de composition du nouveau cockpit ; organiser le
    premier viewport selon le concept (priorités + santé, puis flux + alertes, puis actions). Dans
    `StatsOverviewBlocks`, garder les analyses catalogue/ventes existantes sous le cockpit et conserver exactement le
    tableau de bord générique lorsqu’il n’y a pas de bloc `marketplace`.
  - Fichiers : `app/components/stats/MarketplaceCommandCenter.vue`,
    `app/components/stats/OverviewBlocks.vue`, `app/components/stats/OverviewSkeleton.vue`, `app/pages/index.vue`.
  - Réutilise : page, requête, gestion d’erreur, skeleton et refetch actuels.
  - Sert : R6, R7, R13, R14.
  - Terminé quand : la Direction obtient le cockpit en tête de page, un rôle/payload sans `marketplace` ne régresse
    pas, et un refetch estompe les données sans faire sauter la mise en page.

- [ ] **Écrire les tests composants avant chaque surface.**
  - Ce qui change : faire évoluer le test du command center et ajouter les assertions sur données réelles, zéro,
    alertes absentes, liens, libellés de comparaison et absence de métriques coupées.
  - Fichiers : `test/nuxt/marketplace-command-center.test.ts`, `test/nuxt/stats-partial-contract.test.ts`,
    `test/nuxt/apercu-fixture.ts`.
  - Sert : R5, R7, R13, R14.
  - Terminé quand : les nouveaux tests échouent sur la composition actuelle puis passent sans assouplir le contrat.

### Phase 4 — Rendre la navigation et Opérations immédiatement compréhensibles

- [ ] **Ajouter un indicateur global KatiHub et un état pending sur la destination cliquée.**
  - Ce qui change : monter `NuxtLoadingIndicator` avec l’orange de `brand.config.ts`; dans la navigation, marquer le
    lien déclencheur `aria-busy`, afficher un petit spinner sans déplacer le texte et nettoyer l’état sur succès,
    erreur ou navigation annulée.
  - Fichiers : `app/app.vue`, `app/components/admin/AdminNavigation.vue`, éventuellement
    `app/composables/useAdminNavigationPending.ts` si la logique dépasse le composant.
  - Réutilise : `NuxtRouteAnnouncer`, `Spinner`, hooks Nuxt `page:start` / `page:finish` / `vue:error`.
  - Sert : R8, R9, R13.
  - Terminé quand : un clic produit un signal visuel et accessible immédiat, l’indicateur utilise `#ff7900` depuis la
    source centralisée et aucun état pending ne reste bloqué après un garde de route.

- [ ] **Découper les vingt workspaces Opérations avec les imports paresseux Nuxt.**
  - Ce qui change : remplacer les références auto-importées synchrones par leurs variantes `LazyOperations…`, rendre
    un seul workspace actif sous `Suspense`, et encapsuler l’import dans `NuxtErrorBoundary`. Ajouter un skeleton local
    et un état d’échec de chunk avec réessai ; conserver `activeTab`, les query strings et les règles Direction.
  - Fichiers : `app/pages/operations.vue`,
    `app/components/operations/WorkspaceLoading/WorkspaceLoading.vue`,
    `app/components/operations/WorkspaceLoadError/WorkspaceLoadError.vue`.
  - Réutilise : composants de workspace existants, `PillTabs`, `ApiErrorCard` ou son langage d’erreur, auto-import
    paresseux Nuxt.
  - Sert : R9, R10, R12, R13, R15.
  - Terminé quand : une URL directe charge le bon espace et aucun autre, un changement affiche immédiatement le
    fallback, une erreur d’import propose un réessai, et les deep links/permissions restent inchangés.

- [ ] **Adapter le test de page Opérations et contrôler le découpage produit.**
  - Ce qui change : mettre à jour les stubs pour les composants lazy, tester le fallback et l’échec/réessai, puis
    inspecter le manifeste de build et le waterfall navigateur.
  - Fichier : `test/nuxt/operations-page.test.ts`.
  - Sert : R10, R12, R13, R15.
  - Terminé quand : les cas existants couvrent toujours chaque deep link et chaque rôle, et le build contient des
    chunks distincts pour les workspaces au lieu d’un seul graphe Opérations monolithique.

### Phase 5 — Vérification visuelle, fonctionnelle et performance

- [ ] **Exécuter les portes ciblées puis globales.**
  - Commandes :
    `bunx vitest run test/unit/direction-cockpit.test.ts test/unit/admin-navigation.test.ts`,
    `bunx vitest run test/nuxt/admin-navigation.test.ts test/nuxt/marketplace-command-center.test.ts test/nuxt/operations-page.test.ts test/nuxt/stats-partial-contract.test.ts`,
    `bun run i18n:check`, `bun run lint`, `bun run format:check`, `bun run fallow`, `bun run typecheck`,
    `bun run build`.
  - Terminé quand : les sorties observées sont propres ou les échecs antérieurs sont identifiés sans être masqués.

- [ ] **Comparer le rendu au concept et vérifier le parcours réel.**
  - Ce qui change : lancer l’administration authentifiée, capturer `/fr/` en 1536 × 1024 et en 390 × 844, inspecter
    concept et captures avec `view_image`, puis cliquer Pilotage → Vendeurs → Finance → Commerce et plusieurs onglets
    Opérations.
  - Points obligatoires : hiérarchie priorités/santé, densité des tableaux, palette sans vert, typographie, bordures et
    rayons, libellés exacts, responsive, focus clavier, feedback immédiat, absence de chargement des workspaces
    inactifs.
  - Terminé quand : aucune métrique fictive, aucun vert et aucun écran blanc de navigation ne subsistent ; les écarts
    intentionnels avec le concept sont consignés dans le walkthrough.

- [ ] **Écrire la trace d’implémentation.**
  - Fichier : `walkthroughs/2026-10-15-direction-cockpit-ia.md`.
  - Terminé quand : le walkthrough réutilise exactement le slug `direction-cockpit-ia`, liste les tests réellement
    observés, les tailles/chunks avant-après et toute déviation du plan.

## 9. Contrats de données

### Contrat existant, inchangé

`GET /v1/statistiques/apercu?periode=<aujourdhui|7j|30j|3mois|12mois>` retourne éventuellement :

```ts
interface MarketplaceCommandCenter {
  kpis: {
    gmv: KpiMetric
    orders: KpiMetric
    activeSellers: KpiMetric
    clients: KpiMetric
    activeProducts: KpiMetric
    commissions: KpiMetric
    openDisputes: KpiMetric
  }
  orderStatuses: Array<{ id: MarketplaceOrderStatus; count: number }>
  approvals: { sellers: number; products: number; offers: number }
  topSellers: Array<{ boutiqueId: string; name: string; orders: number; revenue: number }>
  alerts: Array<{ id: MarketplaceAlertId; severity: "danger" | "warning" | "info"; count: number }>
}
```

La page continue d’effectuer une seule requête agrégée. Aucun nouvel endpoint, champ backend, schéma de base de
données ou dépendance n’est requis dans ce premier incrément.

### Contrat de présentation à créer

`app/utils/direction-cockpit.ts` expose une vue pure dérivée, par exemple `buildDirectionQueues(marketplace)`, dont
chaque résultat contient `id`, `count`, `priority`, `owner`, `target`, `to` et `icon`. `priority`, `owner` et `target`
sont explicitement de la politique ; `count` vient toujours d’un chemin du payload documenté en section 5.2.

## 10. États asynchrones

| Surface | Chargement | Vide | Erreur | Partiel/refetch |
| :-- | :-- | :-- | :-- | :-- |
| Page Pilotage | `StatsOverviewSkeleton` adapté à la nouvelle géométrie | Les sous-surfaces gèrent leurs zéros | `ApiErrorCard` + retry existant | Données conservées et estompées avec `aria-busy` |
| Travaux prioritaires | Couvert par le skeleton page | « Aucun travail prioritaire » | Hérite de l’erreur de la requête unique | Les lignes disponibles restent visibles |
| Alertes | Couvert par le skeleton page | « Aucune alerte marketplace » | Hérite de l’erreur de la requête unique | Liste issue uniquement de `alerts` |
| Bloc marketplace absent | Aucun skeleton permanent | Tableau générique existant | Pas de zéro inventé | Comportement compatible ancien backend/rôle |
| Route Nuxt | Barre orange + item pending | Sans objet | Pending nettoyé | Navigation annulée nettoyée |
| Workspace Opérations | Skeleton local sous les onglets | Géré par le workspace actif | État de chunk avec réessai | Un seul workspace monté |

## 11. Plan de tests

- **Unitaires — modèle de files :** justifiés car la déduplication, le mapping des sources, les politiques et les
  destinations sont une logique métier pure pouvant mentir silencieusement.
- **Unitaires — navigation active :** justifiés car plusieurs domaines partagent la route `operations` et se
  distinguent uniquement par `tab`.
- **Composants — cockpit :** vérifier valeurs réelles, zéro, absence de métriques coupées, deep links et libellés ; pas
  de snapshot ni d’assertion de classes décoratives.
- **Composants — navigation :** vérifier visibilité par rôle, français/anglais, desktop/mobile, item actif et pending.
- **Composants — Opérations :** conserver la matrice existante de deep links et rôles, puis ajouter fallback et erreur
  d’import dynamique.
- **Build/waterfall :** nécessaire parce qu’un test DOM ne prouve pas le découpage des chunks.
- **Visuel :** comparaison au concept avec `view_image`, desktop natif et mobile, plus audit explicite de toute couleur
  verte sur les surfaces touchées.

## 12. Risques

- **SLA pris pour une mesure :** le plus grand risque produit. Le libellé « cible » et le document métier doivent
  empêcher de présenter une politique comme un âge observé ; détecté dès Phase 1.
- **Files recouvrantes :** `pending_approvals` agrège vendeurs/produits/offres ; la rendre en plus gonflerait le travail
  affiché. La déduplication est testée en Phase 1.
- **Navigation métier trop large sur laptop :** neuf items plus logo/profil peuvent dépasser avant 1536 px. Détecter
  en Phase 2 ; passer au menu mobile/compact au breakpoint réellement nécessaire plutôt que réduire sous 44 px.
- **Critère actif ambigu :** plusieurs domaines pointent vers `/operations`; l’onglet doit participer au matcher.
- **RBAC trop grossier :** les domaines ne correspondent pas encore à des rôles backend dédiés. Le filtrage continue
  de suivre les gardes réelles, jamais les intitulés métier.
- **Lazy auto-import en test :** les noms `LazyOperations…` demandent des stubs adaptés. Le test doit échouer pour la
  frontière lazy, pas à cause d’un appel backend du workspace.
- **SSR et Suspense :** une URL directe peut attendre l’import côté serveur ; le gain principal porte sur le bundle
  client et la navigation entre onglets. Le manifeste et le waterfall doivent confirmer le bénéfice.
- **Worktree déjà modifié :** `main.css`, `index.vue` et plusieurs composants stats contiennent le rebranding en cours.
  Toute implémentation relit `git diff` avant chaque fichier commun et fusionne les changements, sans checkout/reset.
- **Palette sémantique :** d’anciens composants utilisent `success` pour un résultat favorable. Les nouveaux écrans
  utilisent marine/bleu pour favorable, rouge pour critique, ambre pour attention et orange pour action ; aucun vert.

## 13. Décisions et hypothèses

1. **Cibles de service proposées** — 4 h ouvrées (commandes à examiner), 2 jours ouvrés (vendeurs), 1 jour ouvré
   (produits/offres), 72 h (litiges), 1 jour ouvré (écarts de caisse). Recommandation : les livrer comme politiques
   initiales clairement nommées « cible », puis les faire valider par les responsables métier avant de calculer du
   retard.
2. **Destinations top-level** — un seul point d’entrée par domaine dans cet incrément ; les pages et onglets
   secondaires restent accessibles par les files, actions et l’espace Opérations. Recommandation : observer l’usage
   avant d’ajouter des méga-menus métier.
3. **Anciennes analyses** — conservées sous le cockpit plutôt que supprimées. Recommandation : mesurer leur utilité
   avant une seconde passe qui pourrait les déplacer dans Finance/Catalogue.
4. **Top vendeurs** — le contrat le fournit mais le concept priorise les files et la santé. Recommandation : le garder
   dans les analyses secondaires, pas dans le premier viewport.
5. **Backend** — aucun ajout dans ce premier incrément. Un incrément futur pourra fournir âge réel, compte en retard,
   risque de commande, rapprochements, livraison à l’heure et journal d’anomalies détaillé.
