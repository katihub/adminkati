# Compte rendu : trier et suivre les candidatures vendeurs

Plan : `plans/2026-11-12-candidatures-vendeurs-tri.md`.

## Résultat

- **Onglets avec compteurs** (Réseau commercial → Candidatures vendeurs), à la place du menu de statut :
  - **À traiter** (ouvert par défaut) : dossiers non tranchés qui contiennent au moins une pièce, le dépôt le plus ancien en premier ;
  - **Attente vendeur** : modification demandée ;
  - **Sans pièce** : dossiers non tranchés sans aucune pièce, l'inscription la plus ancienne en premier ;
  - **Validés**, **Refusés**, **Retirés** : les plus récemment modifiés en premier.
  - Les compteurs suivent la recherche et le périmètre du point focal. L'onglet, la recherche et la page sont dans l'adresse.
- **Carte de la liste** :
  - « 3 pièces · 1 à vérifier », ou **Aucune pièce** en rouge ;
  - badge **Complété** quand le vendeur a déposé une pièce alors que son dossier attendait une modification ;
  - badge **Déjà validé** quand un vendeur approuvé dépose une nouvelle pièce ;
  - « Dernier dépôt 11 nov. · inscrit le 2 nov. ».
- **Fiche du dossier** :
  - **Pièces requises** : l'état de chaque pièce (valide, à vérifier, refusée, expirée, manquante) et « x/5 obligatoires valides » ;
  - **documents rangés par type**, avec le nom de la pièce : la version en vigueur, marquée **Nouveau** si elle suit un refus ; les versions remplacées repliées dessous (« 1 version remplacée ») ;
  - **Historique** tiré du journal : dépôts, prises en charge, décisions, avec le nom du membre de l'équipe et le motif ;
  - boutons **Dossier précédent / suivant**.
- **Enchaînement** : après « Approuver », « Demander une modification » ou « Refuser le dossier », le dossier suivant de la liste s'ouvre.

## Données

- Migration `20261112090000_suivi_candidatures` : `vendeurs.derniere_soumission_le` et `vendeurs.resoumis`, remplies pour les dossiers existants à partir des documents.
- `derniere_soumission_le` est posée à chaque dépôt (inscription comprise) ; `resoumis` passe à vrai quand une pièce arrive sur un dossier en `modification_demandee`, et repasse à faux à la décision sur le dossier ou au retrait.

## Non modifié

Un vendeur **approuvé** qui dépose une pièce repasse toujours en `soumis` (comportement existant) ; le badge **Déjà validé** le signale. Ce passage bloque ses retraits d'argent (`finance-vendeur.service.ts` exige `approuve`) : à décider séparément.

## Fichiers

- **BackendKati** :
  - `src/vendeurs/onglets-candidatures.ts` (filtres et tris des onglets) ;
  - `src/vendeurs/historique-dossier.ts` (l'historique, sans adresse IP ni détail brut) ;
  - `VendeursService.lister` (onglet, compteurs, `nombrePieces`, `piecesAVerifier`) et `lire` (`exigences`, `piecesManquantes`, `historique`) ;
  - `soumettreDocument`, `inscrire`, `deciderDossier`, `retirerCandidature` (les deux colonnes).
- **adminkati** :
  - `SellerOnboardingWorkspace.vue` ;
  - nouveaux composants `SellerApplicationTabs`, `SellerApplicationCard`, `SellerDocumentRow`, `SellerFileChecklist`, `SellerFileHistory` ;
  - `utils/seller-applications.ts` ; types `marketplace-moderation.ts` ; quatre traductions `operations.onboarding`.

## Tests

- **BackendKati** : `suivi-candidatures.spec.ts` (10 tests : onglets, tri, compteurs, pièces, dossier complété, effacement à la décision, historique, fiche) ; `vendeurs-point-focal.spec.ts` adapté. 94 tests du module vendeurs au vert.
- **adminkati** : `seller-applications.test.ts` (5 tests) et `seller-onboarding-tabs.test.ts` (3 tests : onglets et cartes, fiche, dossier suivant). Les tests existants de l'écran restent au vert.
- **Non vérifié** : la migration n'a pas été jouée sur une vraie base (Docker n'était pas lancé), et l'écran n'a pas été ouvert dans un navigateur.
