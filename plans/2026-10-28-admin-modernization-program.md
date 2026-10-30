# Implementation Plan — Programme de modernisation du panneau d’administration

## 1. What the mockup shows

La référence propose un poste de pilotage dense mais lisible : une navigation métier permanente à gauche, une barre globale de recherche et d’alertes en haut, puis un espace central composé d’indicateurs, de graphiques et de listes directement actionnables. Son intention n’est pas d’ajouter des décorations, mais de rendre visibles les priorités opérationnelles, de raccourcir les parcours et de donner à chaque agent une entrée stable vers son domaine. La refonte doit reprendre cette logique d’organisation sans recopier les chiffres fictifs ni transformer tous les écrans existants en cartes.

### Structure

- **M1 — Coque d’administration en trois zones** : barre latérale fixe, barre supérieure, contenu principal défilant.
- **M2 — Barre latérale sombre** : marque en tête, entrées métier empilées, entrée active orange, compte et aide en pied.
- **M3 — Barre supérieure** : recherche globale très visible, alertes, messages, identité de l’agent et accès à la marketplace.
- **M4 — En-tête de page** : salutation, résumé de la page, période et raccourcis temporels.
- **M5 — Contenu sur une grille large** : indicateurs en première ligne, analyses au centre, files de travail et alertes en dessous.

### Components

- **M6 — Indicateurs synthétiques** : valeur, variation, contexte et micro-tendance.
- **M7 — Graphiques** : chiffre d’affaires, trafic et répartition des commandes.
- **M8 — Tableau des dernières commandes** : identité, client, boutique, produit, montant, statut, date et actions.
- **M9 — Classements** : vendeurs et produits les plus performants.
- **M10 — Files d’approbation** : boutiques, produits et KYC en attente.
- **M11 — Blocs de contrôle** : paiements, commissions, fraude/anomalies et alertes système.
- **M12 — Actions rapides** : accès direct aux opérations fréquentes.
- **M13 — Support et avis** : tickets et retours récents.

### Typography, colour and surface

- **M14 — Hiérarchie compacte** : titre de page net, libellés courts, chiffres dominants, métadonnées discrètes.
- **M15 — Palette** : bleu nuit pour la structure, orange KatiMarket pour l’action principale, couleurs sémantiques réservées aux statuts.
- **M16 — Surfaces** : fond clair, panneaux blancs, bordures fines et rayons modérés ; faible élévation.

### Spacing and sizing

- **M17 — Densité contrôlée** : navigation et tableaux compacts, cartes suffisamment aérées, alignements constants.
- **M18 — Icônes cohérentes** : taille et trait homogènes, pictogramme toujours accompagné d’un libellé dans la navigation.

### Content and data

- **M19 — Données orientées décision** : les métriques affichées correspondent à une action ou à une surveillance réelle.
- **M20 — Compteurs de travail** : commandes, retraits, litiges et messages non traités visibles depuis la navigation.

### States

- **M21 — État actif visible** dans la navigation et sur les périodes.
- **M22 — Statuts métier colorés** dans les listes.
- **M23 — États non montrés** : chargement, vide, erreur, accès refusé, données partielles, action en cours, succès et conflit de mise à jour.

### Interaction

- **M24 — Navigation directe** depuis les indicateurs, compteurs, lignes, classements et actions rapides.
- **M25 — Recherche globale** couvrant vendeurs, produits, commandes et clients.
- **M26 — Filtres temporels** appliqués aux métriques compatibles.
- **M27 — Menus repliables** suggérés pour Statistiques et Paramètres.

### Responsive and accessibility

- **M28 — Une seule vue bureau est fournie** ; le comportement tablette et mobile n’est pas défini par le mockup.
- **M29 — Points à sécuriser** : contraste des petits textes, libellés des icônes, focus clavier, cibles tactiles et sens non porté par la couleur seule.

## 2. What the requirement asks for

- **R1 — Explicit** : moderniser l’ensemble des interfaces d’administration.
- **R2 — Explicit** : restructurer la navigation et les onglets pour qu’un agent trouve rapidement son module.
- **R3 — Explicit** : afficher dans chaque module toutes les informations nécessaires à la décision et à l’action.
- **R4 — Explicit** : permettre à l’administrateur d’ouvrir une fiche produit détaillée.
- **R5 — Explicit** : permettre à l’administrateur autorisé de modifier les informations d’un produit.
- **R6 — Explicit** : identifier puis combler les fonctions métier manquantes dans les autres modules.
- **R7* — Implied** : définir une architecture de navigation dépendante des rôles et permissions.
- **R8* — Implied** : appliquer un parcours cohérent `liste → détail → création/modification → historique` aux objets administrables.
- **R9* — Implied** : conserver les API, composants et données réelles déjà présents avant de créer de nouveaux contrats.
- **R10* — Implied** : prévoir les états de chargement, vide, erreur, accès refusé, conflit et succès pour chaque surface asynchrone.
- **R11* — Implied** : auditer le comportement réel par rôle, car une fonction existante mais invisible ou non découvrable reste inutilisable pour l’agent.
- **R12* — Implied** : rendre la refonte exploitable sur petits écrans, au clavier et avec lecteur d’écran.
- **R13* — Implied** : livrer par lots indépendants plutôt que remplacer tout le panneau en une seule bascule risquée.

## 3. Mapping

| ID | Element | Requirement | Verdict | Note |
| :-- | :-- | :-- | :-- | :-- |
| M1–M5 | Coque, barre latérale, barre supérieure et grille | R1, R2, R7 | MATCH | Base visuelle de la nouvelle architecture. |
| M6–M13 | Indicateurs, analyses et files de travail | R3, R6 | PARTIAL | À alimenter uniquement avec des données et actions réelles disponibles. |
| M14–M18 | Système visuel compact et cohérent | R1, R12 | MATCH | À décliner dans les primitives existantes, sans dupliquer le design system. |
| M19–M20 | Données actionnables et compteurs | R3, R6 | MATCH | Chaque compteur doit ouvrir sa liste déjà filtrée. |
| M21–M23 | États actifs et métier | R10, R12 | PARTIAL | Le mockup ne montre pas les états asynchrones ni les permissions. |
| M24–M27 | Navigation, recherche et filtres | R2, R3, R7, R8 | MATCH | La recherche globale nécessite d’abord un inventaire des endpoints. |
| M28–M29 | Responsive et accessibilité | R12 | REQUIREMENT-ONLY | Une conception mobile/tablette devra être produite avant le code. |
| — | Fiche produit complète et édition | R4, R5 | REQUIREMENT-ONLY | Le mockup ne dessine pas cet écran ; le projet possède déjà un workspace produit à restructurer. |
| — | Audit des lacunes par module | R6, R9, R11 | REQUIREMENT-ONLY | Travail préalable indispensable avant de figer les lots fonctionnels. |
| — | Livraison incrémentale | R13 | REQUIREMENT-ONLY | Le mockup ne définit pas la stratégie de migration. |

## 4. Cut from the mockup

| ID | Element | Reason for cut |
| :-- | :-- | :-- |
| M7 | « Trafic de la marketplace » | À conserver seulement si une source analytics fiable existe ; aucune donnée fictive ne sera créée. |
| M11 | « Fraude / anomalies » | Ne devient un module que si les règles et endpoints réels sont confirmés pendant l’audit. |
| M13 | Avis clients récents sur le tableau de bord | Secondaire pour la première tranche ; l’accès au module Avis reste prévu dans la navigation. |
| M20 | Valeurs de badges visibles dans la référence | Les nombres du mockup sont illustratifs et ne seront jamais repris. |
| M3 | Bouton « Voir la marketplace » identique à l’image | L’action est utile, mais son libellé, son URL et ses droits seront ceux du produit réel. |

## 5. Gaps — required but not designed

### Architecture proposée

La navigation cible est regroupée par responsabilité, avec visibilité calculée par rôle :

1. **Tableau de bord**
2. **Commerce** — Commandes, Devis, Préparation
3. **Catalogue** — Produits, Stocks, Catégories & rayons, Marques, Modération
4. **Vendeurs** — Boutiques, Candidatures/KYC, Agents, Qualité & sanctions
5. **Clients** — Annuaire, KATI, Avis, Assistance
6. **Livraison & SAV** — Expéditions, Tarifs & zones, Retours, Remboursements, Litiges
7. **Finance** — Paiements, Commissions, Retraits, Rapprochement, Caisse
8. **Marketing & contenus** — Bannières, Promotions, Notifications, Pages du site
9. **Administration** — Équipe, Rôles, Points de vente, Paramètres, Journaux

Les groupes sont repliables. Une entrée sans droit n’est pas seulement désactivée : elle n’est pas exposée. Les compteurs sont réservés aux tâches nécessitant une action.

### Patron fonctionnel commun à chaque module

- **Liste** : recherche, filtres pertinents, tri, pagination, vues enregistrées si justifiées, export et actions groupées autorisées.
- **Détail** : résumé d’identité, statut, informations complètes, relations, documents, historique et actions contextuelles.
- **Création/modification** : validation claire, protection contre la perte de saisie, permissions, confirmation des actions sensibles et retour explicite du serveur.
- **Traçabilité** : auteur, date, ancienne/nouvelle valeur et motif pour les changements sensibles.
- **États** : squelette, vide utile, erreur récupérable, données partielles, lecture seule, accès refusé, conflit de concurrence et succès.

### Fiche produit proposée

Le module actuel possède déjà une liste, une fiche, la création/modification, les images, la fiche PDF, les prix et promotions, les catégories, le stock, les coûts, le retrait/restauration et l’historique. Le manque prioritaire est donc la **découvrabilité et la structure**, puis la vérification de ce qui manque réellement au contrat produit.

La fiche cible regroupe :

- identité, statut de publication et aperçu storefront ;
- nom, slug, marque, descriptions courte et longue ;
- catégorie principale, catégories secondaires et rayon ;
- prix, prix de référence, promotion et période ;
- images, fiche technique et caractéristiques ;
- stock, disponibilité, mouvements, seuils et coûts ;
- délai de livraison ;
- historique des modifications et auteur ;
- liens vers offres/boutiques lorsque ces relations existent dans l’API ;
- MOQ, variantes, tags, SEO et upsell uniquement après confirmation d’un contrat backend réel.

### États non montrés à concevoir

- barre latérale repliée, tablette et menu mobile ;
- recherche globale sans résultat, en erreur et avec résultats groupés ;
- listes vides par filtre et premier usage ;
- détail supprimé ou devenu inaccessible ;
- formulaire en lecture seule selon le rôle ;
- changement concurrent d’un même objet ;
- action longue, partiellement réussie ou annulée ;
- données analytics absentes ou périmées.

## 6. Build plan

> Ce document cadre le programme. Avant l’implémentation de chaque lot ci-dessous, un plan dédié et gelable devra être créé avec le même niveau de précision. Cela évite un remplacement « big bang » et respecte la règle d’un plan par fonctionnalité.

### Phase 1 — Inventaire fonctionnel et matrice de capacités

- [ ] **Construire la matrice écran × action × rôle × API** — relever pour chaque module les parcours liste, détail, création, modification, changement de statut, suppression/archivage, export et historique.
  - Files: `app/pages/*.vue`, `app/components/**`, `app/composables/**`, `app/types/api/**`, `app/utils/admin-destinations.ts`, `../BackendKati/src/**/*.controller.ts`
  - Reuses: routes, composables TanStack Query, métadonnées `definePageMeta`, contrats TypeScript existants.
  - Serves: R3, R6, R7, R9, R11
  - Done when: une matrice vérifiée distingue « disponible et visible », « disponible mais mal exposé », « lecture seule par permission » et « contrat manquant » pour tous les domaines de navigation.

- [ ] **Tester les parcours critiques avec chaque rôle réel** — direction, comptoir, préparation, livreur et point focal.
  - Files: `app/middleware/**`, `app/types/session.ts`, `app/utils/admin-navigation.ts`, pages concernées.
  - Reuses: session et gardes de route existants.
  - Serves: R5, R7, R11
  - Done when: chaque incapacité reproduite possède une cause classée UI, permission, donnée ou API ; le cas « modifier un produit » est validé avec un compte `direction` et confirmé en lecture seule pour `comptoir` si la règle métier actuelle est conservée.

- [ ] **Prioriser les écarts** — classer P0 blocage opérationnel, P1 forte friction, P2 enrichissement.
  - Files: futur plan dédié par lot dans `plans/`.
  - Reuses: matrice de capacités.
  - Serves: R6, R13
  - Done when: aucun élément d’un lot n’est démarré sans propriétaire, dépendances, endpoint et critère d’acceptation.

### Phase 2 — Concept visuel complet et design system

- [ ] **Produire et faire valider les concepts bureau, tablette et mobile** — couvrir coque, tableau de bord, liste, détail, formulaire, modal et états asynchrones, en utilisant la référence comme direction visuelle.
  - Files: artefacts de concept à référencer dans le plan dédié ; aucun fichier source avant validation.
  - Reuses: palette KatiMarket, `app/assets/css/main.css`, composants `app/components/ui/**` et `app/components/vuzeno/**`.
  - Serves: R1, R2, R8, R10, R12
  - Done when: la structure, la densité, les breakpoints, les états et les composants sont approuvés avant codage.

- [ ] **Définir les tokens et familles de composants** — largeur de sidebar, hauteur de topbar, espacements, typographie, couleurs, statuts, focus, tables, formulaires et panneaux de détail.
  - Files: `app/assets/css/main.css`, futurs composants dans `app/components/admin/**`; ne pas modifier directement les composants générés dans `app/components/ui/**`.
  - Reuses: tokens Tailwind/Shadcn existants et icônes Phosphor déjà utilisées.
  - Serves: R1, R10, R12
  - Done when: chaque valeur nouvelle est un token ou un variant partagé et non une exception copiée dans plusieurs pages.

### Phase 3 — Nouvelle coque et architecture de navigation

- [ ] **Remplacer la navigation horizontale par une sidebar métier responsive** — groupes repliables, état actif, compteurs réels, version réduite et drawer mobile.
  - Files: `app/components/admin/AdminShell.vue`, `app/components/admin/AdminHeader.vue`, `app/components/admin/AdminNavigation.vue`, `app/layouts/admin.vue`, `app/utils/admin-navigation.ts`, `app/utils/admin-destinations.ts`, locales `i18n/locales/*.json`.
  - Reuses: `BrandWordmark`, `AdminProfileMenu`, `LanguageSwitcher`, session et permissions existantes.
  - Serves: R1, R2, R7, R12
  - Done when: un agent atteint chaque domaine autorisé en deux interactions maximum, la page active reste évidente et la navigation clavier/mobile est complète.

- [ ] **Décomposer la page Opérations surchargée** — déplacer ses 24 onglets vers des routes et sous-menus métier, en gardant des redirections compatibles pour les anciens liens.
  - Files: `app/pages/operations.vue`, nouvelles pages sous `app/pages/`, `app/utils/admin-destinations.ts`, workspaces existants dans `app/components/operations/**`.
  - Reuses: chaque workspace existant ; aucun écran métier n’est réécrit à ce stade.
  - Serves: R2, R6, R8, R13
  - Done when: aucun module principal ne dépend d’une liste plate de 24 onglets et les anciennes URLs ouvrent le nouvel emplacement correspondant.

- [ ] **Ajouter une recherche globale et un centre d’alertes** — seulement sur les domaines dont les endpoints sont confirmés.
  - Files: nouveaux composants dans `app/components/admin/**`, composables dédiés dans `app/composables/**`, contrats dans `app/types/api/**`.
  - Reuses: `useApiFetch`, TanStack Query, menus et command components existants si compatibles.
  - Serves: R2, R3, R9, R10
  - Done when: la recherche groupe des résultats réels par type, respecte les droits et ouvre directement l’objet ; les alertes ouvrent une file préfiltrée.

### Phase 4 — Tranche verticale de référence : Produits

- [ ] **Rendre la fiche et l’édition immédiatement découvrables** — une ligne ouvre une URL stable de détail, un bouton « Modifier » explicite apparaît pour `direction`, et le mode lecture seule est annoncé pour les autres rôles.
  - Files: `app/pages/products.vue`, `app/components/products/ListItem.vue`, `app/components/products/DetailHeader.vue`, `app/components/products/DetailActionButtons.vue`, `app/components/products/DetailForm.vue`, `app/utils/admin-destinations.ts`.
  - Reuses: `useProduits`, `useProduit`, `useCreateProduit`, `useUpdateProduit`, formulaire et panneaux produits actuels.
  - Serves: R4, R5, R7, R8, R11
  - Done when: depuis la navigation, un administrateur `direction` trouve un produit, voit sa fiche complète, modifie un champ, enregistre, recharge et retrouve la valeur persistée ; un rôle lecture seule ne voit aucune action trompeuse.

- [ ] **Réorganiser la fiche produit par domaines** — Général, Prix & promotion, Médias, Catégorisation, Stock & coûts, Livraison et Historique, sans retirer les fonctions existantes.
  - Files: `app/components/products/DetailForm.vue`, `Overview*.vue`, `Inventory*.vue`, `DatasheetPanel.vue`, `HistoryPanel.vue`, `CostHistoryPanel.vue`, `SummaryKpis.vue`.
  - Reuses: composants produits existants et schémas `app/schemas/produit.ts`.
  - Serves: R1, R3, R4, R8, R10
  - Done when: chaque donnée du contrat `ProductDetail` possède un emplacement lisible, les actions sont près de leur contexte, les états et erreurs restent visibles et aucun comportement produit existant ne régresse.

- [ ] **Compléter seulement les données produit confirmées manquantes** — MOQ, variantes, tags, SEO, offre/boutique et upsell sont traités dans des plans séparés si la phase 1 confirme un écart de schéma ou d’endpoint.
  - Files: à déterminer dans le plan dédié, potentiellement `app/types/api/produits.ts`, `app/schemas/produit.ts`, `../BackendKati/src/catalogue/**` et schéma de base.
  - Reuses: contrat produit actuel et migrations backend existantes.
  - Serves: R3, R6, R9
  - Done when: aucune donnée fictive ou champ UI sans persistance n’est livré ; chaque ajout est visible sur la fiche publique lorsqu’il doit l’être.

### Phase 5 — Commerce, livraison et SAV

- [ ] **Uniformiser Commandes et Devis** — listes filtrables, fiche complète, client, boutique, lignes, paiement, livraison, factures, timeline et actions permises.
  - Files: `app/pages/orders.vue`, `app/components/orders/**`, `app/components/quotes/**`, `app/composables/useOrders.ts`, `app/composables/useOrderMutations.ts`.
  - Reuses: workspaces et mutations actuels.
  - Serves: R1, R3, R6, R8, R10
  - Done when: une commande peut être suivie de sa création à sa clôture sans changer de module pour retrouver son contexte.

- [ ] **Unifier Expéditions, Retours, Remboursements et Litiges** — présenter une timeline commune et des actions conditionnées par le statut.
  - Files: `app/components/operations/MarketplaceDisputesWorkspace.vue`, workspaces livraison existants, nouvelles routes métier, composables `useMarketplace*` concernés.
  - Reuses: endpoints de livraison et demandes client existants.
  - Serves: R2, R3, R6, R8, R10
  - Done when: chaque incident expose commande, vendeur, client, preuves, messages, décisions, remboursement et historique sans perte de contexte.

### Phase 6 — Vendeurs, clients et réputation

- [ ] **Créer des fiches consolidées Boutique et Vendeur** — identité, KYC, lieux, agents, catalogue, commandes, finance, SAV choisi, qualité et sanctions.
  - Files: workspaces `app/components/operations/Seller*.vue`, nouvelles pages et composants vendeur, types/composables marketplace existants.
  - Reuses: onboarding, finance vendeur, trust, agents et offres actuels.
  - Serves: R1, R3, R6, R8
  - Done when: l’agent n’a plus à parcourir plusieurs onglets Opérations pour comprendre et administrer une boutique.

- [ ] **Compléter la fiche Client** — profil, adresses, commandes, KATI, avis, tickets, remboursements et actions de compte.
  - Files: `app/pages/users.vue`, `app/components/users/**`, `app/composables/useCustomers.ts`, `app/composables/useCustomerMutations.ts`, types clients/KATI.
  - Reuses: fiche client, commandes et statut existants.
  - Serves: R1, R3, R6, R8, R10
  - Done when: toutes les relations client disponibles sont visibles avec permissions, états et liens vers leurs modules sources.

### Phase 7 — Finance, contenus et administration

- [ ] **Structurer les workflows financiers** — paiements, commissions, retraits, remboursements, rapprochement et caisse avec preuves et historique.
  - Files: `app/pages/caisse.vue`, `app/components/caisse/**`, `app/components/operations/SellerFinanceWorkspace.vue`, nouvelles routes finance.
  - Reuses: contrats finance, caisse et paiements existants.
  - Serves: R1, R3, R6, R8, R10
  - Done when: chaque mouvement est traçable jusqu’à la commande, la boutique, la décision et la preuve correspondantes.

- [ ] **Regrouper Marketing et contenus sans mélanger leurs responsabilités** — bannières, annonces, notifications sortantes et textes légaux conservent leurs éditeurs spécialisés.
  - Files: `app/pages/content.vue`, `app/pages/site-texts.vue`, `app/components/content/**`, `app/components/site-texts/**`.
  - Reuses: éditeurs et workflows de publication actuels.
  - Serves: R1, R2, R3, R6
  - Done when: chaque contenu montre son statut, son emplacement, son aperçu, sa période, son historique et son action de publication.

- [ ] **Compléter l’administration interne** — équipe, rôles, périmètres, points de vente, paramètres et journal d’audit.
  - Files: `app/pages/team.vue`, `app/components/team/**`, nouvelles routes de paramètres/journaux si les contrats existent.
  - Reuses: annuaire équipe et permissions actuels.
  - Serves: R2, R3, R6, R7, R8
  - Done when: les droits visibles dans l’interface correspondent aux droits appliqués par le backend et chaque changement sensible est attribuable.

### Phase 8 — Stabilisation et déploiement progressif

- [ ] **Vérifier chaque tranche fonctionnelle et visuelle** — tests unitaires/composants, build, navigation réelle, responsive et comparaison au concept accepté.
  - Files: tests colocaux existants, aucun nouveau framework E2E dans le dépôt ; artefacts de walkthrough et review associés à chaque plan.
  - Reuses: Vitest, Nuxt build, Browser/IAB ou Playwright externe pour la vérification rendue.
  - Serves: R1, R10, R12, R13
  - Done when: zéro erreur console bloquante, états asynchrones validés, parcours clavier et mobile vérifiés, et écarts visuels consignés puis corrigés.

- [ ] **Activer lot par lot avec compatibilité des URLs** — bascule contrôlée, mesure des erreurs et possibilité de retour par module.
  - Files: routes, redirections et configuration de déploiement concernées par chaque lot.
  - Reuses: routes et observabilité existantes.
  - Serves: R11, R13
  - Done when: chaque lot est exploitable indépendamment, sans bloquer les modules non encore modernisés.

## 7. Data contracts

### Confirmed today

- **Produits** : `GET /catalogue/administration/produits`, `GET /catalogue/administration/produits/:id`, `POST /catalogue/administration/produits`, `PATCH /catalogue/administration/produits/:id`, retrait/restauration, images, fiche PDF, inventaire, mouvements et coûts. Les types `ProductListItem` et `ProductDetail` existent dans `app/types/api/produits.ts`.
- **Taxonomie** : lecture, création, modification et suppression des catégories/rayons, plus recalcul des compteurs.
- **Clients** : annuaire, détail, suspension et réactivation.
- **Litiges/SAV** : demandes, contextes, messages, pièces, retours, décisions, expédition, réception, remboursement, contestation et arbitrage.
- **Livraison** : agents, affectation, prise en charge, départ, preuves, incidents, code et confirmation.
- **Finance vendeur** : comptes boutique, retraits, décisions, reversements, rapprochements et pièces.
- **KATI** : indicateurs, clients, détail, transferts, ajustements, parrainages et politiques.

### To verify before adding UI

- recherche globale fédérée et compteurs d’alertes par domaine ;
- analytics de trafic ;
- journal d’audit transverse ;
- contrats complets Boutique/Vendeur consolidés ;
- permissions fines au-delà des rôles globaux ;
- MOQ, variantes, tags, SEO et relations d’upsell dans l’administration produit ;
- factures/reçus administratifs et rapprochement de paiement consolidé ;
- règles de fraude/anomalies.

Tout contrat absent reçoit un plan backend séparé. Aucun champ « décoratif » ne sera ajouté au frontend sans lecture et persistance réelles.

## 8. Test plan

- **Navigation et permissions** : tests de visibilité/activation par rôle et de compatibilité des anciennes URLs, car une mauvaise entrée expose soit trop, soit pas assez.
- **Produit, tranche de référence** : tests de liste, sélection, lecture seule, création, modification, validation, sauvegarde, conflit, retrait/restauration, médias et stock ; c’est le patron réutilisé par les autres modules.
- **Composants partagés** : tests des états loading/empty/error/partial et du comportement responsive de la coque.
- **Contrats** : tests des adaptateurs de réponse et invalidations TanStack Query pour éviter les fiches périmées après mutation.
- **Accessibilité** : navigation clavier, focus visible, libellés accessibles, annonces d’erreurs et contraste.
- **Vérification rendue** : desktop, tablette et petit mobile dans le navigateur ; comparaison directe avec les concepts approuvés avant chaque livraison.
- **Non-régression métier** : chaque lot reprend les parcours existants avant la refonte puis vérifie les nouvelles actions avec des données réelles ou des fixtures de test représentatives.

## 9. Risks

- **Fonctions déjà présentes mais jugées absentes** : le produit possède déjà détail et édition ; le risque est de reconstruire au lieu de corriger la découvrabilité. Il est levé en phase 1.
- **Page Opérations monolithique** : déplacer 24 onglets peut casser les favoris et liens internes. Les redirections sont livrées avant la nouvelle navigation.
- **Permissions frontend/backend divergentes** : un bouton visible peut finir en 403. La matrice par rôle est validée avant le design final de chaque action.
- **Données analytiques manquantes** : le mockup montre plus de métriques que les contrats confirmés. Toute carte sans source fiable est retirée.
- **Périmètre très large** : une refonte totale en parallèle créerait des incohérences et retarderait toute valeur. Les lots sont verticaux et indépendamment livrables.
- **Régression fonctionnelle sous une amélioration visuelle** : les composants métier actuels sont réutilisés avant d’être remaniés ; les parcours sont capturés et testés lot par lot.
- **Responsive non défini par la référence** : concepts tablette/mobile obligatoires avant le code de la coque.
- **Historique incomplet** : si le backend ne journalise pas une mutation, l’interface ne doit pas prétendre qu’elle est auditée ; le besoin devient un contrat backend séparé.

## 10. Needs a decision

1. **Droit de modification des produits** — options : conserver l’écriture au rôle `direction` uniquement, ou créer une permission catalogue plus fine. **Recommandation :** passer à des permissions fines après l’audit, sans élargir provisoirement le rôle `comptoir`.
2. **Recherche globale** — options : fédérer les endpoints existants côté frontend, ou créer un endpoint backend unique. **Recommandation :** endpoint backend unique si plus de trois domaines doivent être interrogés, pour gérer droits, classement et performance proprement.
3. **Ordre de livraison après Produits** — options : Commerce/SAV, Vendeurs/Clients ou Finance. **Recommandation :** Commerce puis Livraison/SAV, car ils portent le plus de dépendances opérationnelles et donnent le patron des timelines et statuts.
4. **Tableau de bord par rôle** — options : un dashboard global filtré, ou une composition différente par rôle. **Recommandation :** une coque commune et des blocs composés par rôle ; un livreur ou un point focal ne doit pas voir un dashboard de direction appauvri.
5. **Migration de la page Opérations** — options : bascule immédiate ou coexistence temporaire avec redirections. **Recommandation :** coexistence courte par lot, puis suppression de l’ancien conteneur quand tous ses onglets ont une destination stable.

