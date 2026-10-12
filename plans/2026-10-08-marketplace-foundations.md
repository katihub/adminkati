# Implementation Plan — Marketplace foundations

## 1. What the mockup shows

Les références proposent une marketplace camerounaise mobile et desktop fondée sur la recherche, la confiance, la couleur bleu marine/orange et quatre espaces distincts : acheteur, vendeur, affiliation et administration. Elles présentent une vision complète de l'écosystème, mais pas les états d'erreur, de modération, de litige ou de rapprochement nécessaires au fonctionnement réel. Leur intention est de rendre KatiHub immédiatement compréhensible comme point d'entrée unique pour acheter, vendre et se faire livrer.

### Structure

- **M1 — Logo KatiHub complet** : chariot, globe, avion, nom et signature, avec déclinaisons non montrées.
- **M2 — En-tête desktop** : menu, logo, recherche centrale, localisation, langue/devise, favoris, compte et panier.
- **M3 — Navigation mobile basse** : accueil, catégories, panier et compte.
- **M4 — Accueil desktop en trois colonnes** : catégories, contenu principal, rail de compte/promotions/classement.
- **M5 — Accueil mobile** : recherche, grand visuel, raccourcis services, produits populaires.
- **M6 — Catalogue** : filtres/catégories et grille de produits.
- **M7 — Fiche produit** : galerie, prix, stock, variantes, quantité, ajout panier, promesses de service et avis.
- **M8 — Checkout** : progression panier/livraison/paiement, lignes, sous-total, livraison, total et moyens de paiement.
- **M9 — Espace client** : commandes, suivi, avis, adresses, paiements et support.
- **M10 — Espace vendeur** : produits, stock, commandes, paiements, commissions, marketing et paramètres.
- **M11 — Espace affiliation** : lien, clics, inscriptions, commandes, commissions et filleuls.
- **M12 — Administration** : navigation, indicateurs, graphique et commandes récentes.

### Composants et contenu

- **M13 — Recherche universelle** : produit, catégorie ou boutique.
- **M14 — Carte produit** : image, nom, prix, remise, note et compteur d'avis.
- **M15 — Badge vendeur vérifié**.
- **M16 — Blocs Market/Express/Service** avec couleurs propres.
- **M17 — Carte vendeur et appel à ouvrir une boutique**.
- **M18 — Classement des meilleures ventes**.
- **M19 — Résumé financier vendeur**.
- **M20 — Tableau d'activité d'affiliation**.

### Typographie, couleur et surfaces

- **M21 — Bleu marine** pour structure, navigation et confiance.
- **M22 — Orange** pour appels à l'action, prix et activité commerciale.
- **M23 — Vert/rouge/violet** comme couleurs de services et statuts.
- **M24 — Surfaces blanches** avec bordures fines, rayons modérés et ombres légères.
- **M25 — Typographie sans sérif dense**, avec script décoratif limité aux slogans.

### États montrés et absents

- **M26 — Montrés** : produit en stock, remises, vendeur vérifié, commande en cours/livrée, navigation active.
- **M27 — Absents** : chargement, vide, erreur, hors ligne, paiement échoué, acompte remboursé, offre refusée, vendeur suspendu, litige, caisse en écart, livraison partielle et code bloqué.

### Responsive et accessibilité

- **M28 — Deux largeurs observées** : mobile et desktop ; la tablette n'est pas définie.
- **M29 — Risques observés** : densité élevée, nombreux petits textes et actions, sens parfois porté par la couleur, logo détaillé difficile à réduire.

## 2. What the requirement asks for

- **R1 — Explicite** : NowTech devient une boutique de KatiHub.
- **R2 — Explicite** : KatiHub supporte plusieurs vendeurs.
- **R3 — Explicite** : chaque offre vendeur est validée par KatiHub avant publication.
- **R4 — Explicite** : KatiHub peut sanctionner, suspendre ou exclure un vendeur.
- **R5 — Explicite** : le vendeur peut organiser la livraison ou utiliser KatiHub.
- **R6 — Explicite** : la responsabilité logistique change après prise en charge prouvée pour une livraison KatiHub.
- **R7 — Explicite** : un acompte de 10 %, minimum 1 000 FCFA et plafonné au total, est demandé pour une livraison.
- **R8 — Explicite** : l'acompte est remboursable avant le déplacement du livreur.
- **R9 — Explicite** : les frais de livraison sont payés à la livraison.
- **R10 — Explicite** : le livreur collecte le solde et remet l'argent à son superviseur.
- **R11 — Explicite** : un code par expédition confirme la livraison.
- **R12 — Explicite** : le retour normal est ouvert pendant cinq jours calendaires.
- **R13 — Explicite** : produit et vendeur reçoivent des notes séparées.
- **R14 — Explicite** : les demandes client apparaissent dans l'espace vendeur.
- **R15 — Explicite** : le checkout encourage le compte sans l'imposer.
- **R16 — Explicite** : les calculs financiers sont exacts, auditables et résistants aux doubles opérations.
- **R17 — Explicite** : le lancement logistique maîtrisé couvre Douala puis Yaoundé.
- **R18 — Explicite** : Kati et affiliation sont différés jusqu'à décision de leurs règles.
- **R19* — Impliqué** : produit canonique et offre vendeur sont séparés.
- **R20* — Impliqué** : une commande multi-vendeurs produit des sous-commandes et expéditions indépendantes.
- **R21* — Impliqué** : le catalogue marketplace est durable et ne dépend pas du schéma `nowtech` régénéré.
- **R22* — Impliqué** : caisse, reversement et registre financier sont distincts.
- **R23* — Impliqué** : permissions KatiHub et permissions boutique sont distinctes et périmétrées.

## 3. Mapping

| ID | Element | Requirement | Verdict | Note |
| :-- | :-- | :-- | :-- | :-- |
| M1 | Identité KatiHub | R1, R2 | MATCH | Une version simplifiée du logo sera nécessaire |
| M2-M7 | Navigation et catalogue | R2, R15, R19 | PARTIAL | Les maquettes ne distinguent pas assez produit et offre |
| M8 | Checkout | R7-R9, R15, R20 | PARTIAL | Acompte et regroupement vendeur absents |
| M9 | Espace client | R11-R13 | PARTIAL | Retours et litiges non détaillés |
| M10 | Espace vendeur | R3-R6, R14 | PARTIAL | Modération, sanctions et caisse manquent |
| M11 | Affiliation | R18 | MOCKUP-ONLY | Différé du premier lancement |
| M12 | Administration | R3, R4, R16, R22, R23 | PARTIAL | Les opérations critiques ne sont pas dessinées |
| M13-M15 | Recherche, produit, vendeur | R2, R13, R19 | MATCH | Ajouter comparaison des offres et volumes d'avis |
| M16 | Cinq services | R18 | MOCKUP-ONLY | Market et Express seulement au premier périmètre |
| M17 | Ouverture boutique | R2, R3 | MATCH | Doit mener au KYC, pas à une activation immédiate |
| M18 | Classement ventes | — | MOCKUP-ONLY | Non nécessaire aux fondations |
| M19 | Résumé vendeur | R16, R22 | PARTIAL | Doit séparer brut, commission, retenues et disponible |
| M20 | Affiliation | R18 | MOCKUP-ONLY | Différé |
| M21-M25 | Charte visuelle | R1, R2 | MATCH | Inspiration, pas reproduction exacte |
| M26-M27 | États | R3-R16 | PARTIAL | Tous les états absents sont du scope fonctionnel |
| M28-M29 | Responsive/accessibilité | R15, R17 | PARTIAL | Tablette, faible débit et accessibilité à concevoir |
| — | Catalogue durable | R21 | REQUIREMENT-ONLY | Travaux backend avant écran |
| — | Sous-commandes/expéditions | R20 | REQUIREMENT-ONLY | Contrats à créer |
| — | Registre financier | R16, R22 | REQUIREMENT-ONLY | Aucun écran ne peut le remplacer |
| — | Responsabilité prouvée | R6 | REQUIREMENT-ONLY | Surface opérations requise |

## 4. Cut from the mockup

| ID | Element | Reason for cut |
| :-- | :-- | :-- |
| M11, M20 | Affiliation complète | Règles reportées |
| M16 Service | Module hors cœur marketplace initial |
| M18 | Classement meilleures ventes | Optimisation commerciale non nécessaire aux fondations |
| M12 graphique décoratif | Analytics avancée après fiabilisation des sources |
| M25 script décoratif généralisé | Lisibilité et cohérence d'interface |

## 5. Gaps — required but not designed

- **G1 — KYC vendeur** : proposer un workspace liste/détail réutilisant les patterns `users` et `team`.
- **G2 — Modération d'offre** : adapter le pattern `content/propositions` pour voir la révision, la version publiée et la décision.
- **G3 — Sous-commandes** : étendre le détail commande avec regroupement par boutique et expédition.
- **G4 — Caisse logistique** : étendre le workspace caisse avec porteur, superviseur, lots et dépôts.
- **G5 — Responsabilité** : créer une timeline d'expédition avec preuve de prise en charge.
- **G6 — Reversement vendeur** : créer une surface financière lisible et non éditable directement.
- **G7 — États non montrés** : chargement, vide, erreur, conflit, paiement échoué, OTP bloqué, suspension et litige.
- **G8 — Responsive** : conserver la liste/détail existante sur desktop et navigation panneau-à-panneau sur mobile.

## 6. Build plan

### Phase 1 — Contrats et permissions

- [ ] **Étendre les rôles et le contexte d'accès** — introduire capacités KatiHub, appartenance boutique et périmètre sans remplacer les contrôles existants.
  - Files: `../BackendKati/prisma/schema.prisma`, `../BackendKati/src/commun/garde/*`, `app/types/session.ts`, `app/utils/access.ts`, `app/middleware/auth.global.ts`
  - Reuses: garde d'appelant, rôles d'équipe, navigation filtrée
  - Serves: R2, R4, R23
  - Done when: un membre vendeur ne peut lire ou modifier que sa boutique et un modérateur peut agir sur toutes les boutiques autorisées.

- [ ] **Ajouter les contrats vendeur/boutique** — modèles, DTO, projections et endpoints de lecture/création contrôlée.
  - Files: `../BackendKati/prisma/schema.prisma`, nouveau module `../BackendKati/src/vendeurs/`, nouveaux types `app/types/api/vendeurs.ts`, nouveaux composables `app/composables/useVendeurs.ts`
  - Reuses: PrismaService, JournalService, Result/API patterns
  - Serves: R1-R4, R23
  - Done when: NowTech existe comme boutique initiale et les accès croisés sont refusés par le backend.

### Phase 2 — Catalogue durable et modération

- [ ] **Créer Produit, Offre, Révision et stock d'offre**.
  - Files: `../BackendKati/prisma/schema.prisma`, nouvelle migration, nouveaux modules `catalogue/marketplace` et `offres`
  - Reuses: mouvements de stock, idempotence, administration catalogue
  - Serves: R2, R3, R19, R21
  - Done when: deux boutiques peuvent proposer le même produit avec prix et stocks indépendants.

- [ ] **Construire le workflow de modération**.
  - Files: nouveaux services/controllers backend, `app/pages/products.vue`, nouveaux composants `app/components/offers/`, locales `i18n/locales/products/*`
  - Reuses: `content/propositions/*`, `ApiErrorCard`, `EmptyStateCard`, `InlineStateNotice`
  - Serves: R3, R4
  - Done when: une offre soumise reste invisible jusqu'à validation et chaque décision est auditée.

- [ ] **Importer NowTech de façon rejouable**.
  - Files: nouveau script `../BackendKati/scripts/`, migration de bootstrap, tests de correspondance
  - Reuses: mécanismes d'import et d'instantané de stock existants
  - Serves: R1, R21
  - Done when: les comptes produit/stock concordent et une seconde exécution ne crée aucun doublon.

### Phase 3 — Commande multi-vendeurs et finance

- [ ] **Ajouter sous-commandes et captures d'offre**.
  - Files: schéma Prisma, modules `commandes`, contrats `app/types/api/commandes.ts`, composants `app/components/orders/*`
  - Reuses: commande actuelle, projections par rôle, machine à états
  - Serves: R2, R20
  - Done when: une commande à deux boutiques crée deux sous-commandes cohérentes sans casser une commande historique.

- [ ] **Implémenter acompte et allocations exactes**.
  - Files: nouveau module financier backend, DTO checkout, types admin et site
  - Reuses: entiers FCFA, idempotence, ajustements, paiement Fapshi
  - Serves: R7-R9, R16
  - Done when: tests de propriétés prouvent que toute allocation somme exactement au global.

- [ ] **Introduire le registre financier équilibré**.
  - Files: schéma Prisma, module `finance`, intégration `paiements` et `caisse`, nouvelle surface finance admin
  - Reuses: `EntreeJournal`, `Encaissement`, `RemiseCaisse`
  - Serves: R10, R16, R22
  - Done when: aucune transaction déséquilibrée ne peut être persistée et chaque solde est reconstructible.

### Phase 4 — Livraison hybride et caisse

- [ ] **Créer expéditions et preuves de prise en charge**.
  - Files: nouveau module backend `expeditions`, types API, composants `app/components/delivery/`
  - Reuses: livreur actuel, timeline existante, transitions de commande
  - Serves: R5, R6, R20
  - Done when: le responsable d'un colis est déterminable à tout instant.

- [ ] **Créer OTP de livraison par expédition**.
  - Files: service backend sécurisé, endpoints livreur, interface de saisie, notifications
  - Reuses: journal, garde livreur, notifications
  - Serves: R11
  - Done when: le code n'est jamais renvoyé au livreur, les essais sont limités et un rejeu ne confirme rien deux fois.

- [ ] **Étendre la caisse au superviseur et aux lots**.
  - Files: modèles/services caisse, `app/types/api/caisse.ts`, `app/components/caisse/*`
  - Reuses: caisse par porteur, comptage, écarts et encours
  - Serves: R10, R16, R22
  - Done when: l'argent est suivi du client au dépôt et tout écart reste visible.

### Phase 5 — Retours, demandes et réputation

- [ ] **Rattacher les demandes client aux vendeurs et commandes**.
  - Files: module assistance backend, `app/components/operations/CustomerRequestsWorkspace.vue`, types/composables assistance
  - Reuses: workspace actuel liste/détail et conversation
  - Serves: R14
  - Done when: le vendeur traite son périmètre et KatiHub peut reprendre le dossier.

- [ ] **Ajouter les retours de cinq jours**.
  - Files: nouveau module `retours`, surfaces commandes/opérations, contrats et notifications
  - Reuses: transitions, remboursement, journal
  - Serves: R12, R16
  - Done when: un retour validé corrige stock, paiement, commission et solde vendeur atomiquement.

- [ ] **Ajouter les avis vérifiés**.
  - Files: nouveau module `avis`, administration de modération, site client ultérieur
  - Reuses: commandes livrées, rôles, journal
  - Serves: R13
  - Done when: aucun compte sans achat livré ne peut créer un avis vérifié.

## 7. Data contracts

Nouveaux groupes d'endpoints à définir :

- `/v1/vendeurs`, `/v1/boutiques`, `/v1/documents-vendeur` ;
- `/v1/produits-marketplace`, `/v1/offres`, `/v1/offres/:id/revisions` ;
- `/v1/commandes/:id/sous-commandes` ;
- `/v1/expeditions`, `/v1/expeditions/:id/prise-en-charge`, `/confirmation` ;
- `/v1/finance/transactions`, `/v1/reversements` ;
- `/v1/retours`, `/v1/avis`.

Les contrats existants de commandes et caisse restent valides pour l'historique ; les nouveaux champs sont ajoutés sans rendre les anciennes réponses mensongères.

## 8. Test plan

- Tests unitaires et base sur permissions croisées entre boutiques.
- Tests de workflow vendeur et offre, incluant transitions interdites.
- Tests de concurrence du stock d'offre.
- Tests par propriétés des allocations FCFA.
- Tests d'idempotence des paiements, encaissements, OTP et remboursements.
- Tests de conservation des commandes historiques.
- Tests admin des états loading/empty/error et des interdictions de rôle.
- Tests de migration rejouable avec comptes et sommes avant/après.

## 9. Risks

- Le schéma `nowtech` destructible rend toute clé étrangère directe dangereuse ; détecté dès Phase 2.
- Les rôles globaux actuels ne suffisent pas au périmètre boutique ; détecté dès Phase 1.
- Une commande globale unique masque les livraisons partielles ; détecté en Phase 3.
- La caisse actuelle suit un porteur mais pas encore les transferts superviseur/dépôt ; détecté en Phase 4.
- La commission de 10 % reste une hypothèse à valider juridiquement et économiquement avant gel des contrats.
- L'administration contient un `package-lock.json` non suivi alors que le dépôt impose Bun ; ne pas le supprimer sans confirmer son origine.

## 10. Needs a decision

1. **Facturation et TVA** — qui facture la vente au client ? Recommandation : validation juridique/fiscale avant Phase 3.
2. **Commission définitive** — taux unique ou par catégorie ? Recommandation : mécanisme configurable, taux unique au pilote.
3. **Frais après départ livreur** — montant fixe ou coût réel plafonné ? Recommandation : barème par zone affiché avant commande.
4. **Reversement** — quotidien, hebdomadaire ou seuil ? Recommandation : hebdomadaire au pilote, après délai de retour.
5. **Garantie par catégorie** — règles minimales et exclusions. Recommandation : matrice validée avant publication des vendeurs pilotes.
6. **Partenaire de paiement** — modèle exact de collecte et remboursement. Recommandation : PSP agréé et callbacks signés vérifiés.
