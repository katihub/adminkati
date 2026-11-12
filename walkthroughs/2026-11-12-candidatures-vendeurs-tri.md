# Compte rendu : trier et suivre les candidatures vendeurs

Plan : `plans/2026-11-12-candidatures-vendeurs-tri.md`.

## Résultat

- **Onglets avec compteurs** (Réseau commercial → Candidatures vendeurs), à la place du menu de statut :
  - **À traiter** (ouvert par défaut) : dossiers non tranchés qui contiennent au moins une pièce, et vendeurs validés avec une pièce à vérifier ; le dépôt le plus ancien en premier ;
  - **Attente vendeur** : modification demandée ;
  - **Sans pièce** : dossiers non tranchés sans aucune pièce, l'inscription la plus ancienne en premier ;
  - **Validés**, **Refusés**, **Retirés** : les plus récemment modifiés en premier.
  - Les compteurs suivent la recherche et le périmètre du point focal. L'onglet, la recherche et la page sont dans l'adresse.
- **Carte de la liste** :
  - « 3 pièces · 1 à vérifier », ou **Aucune pièce** en rouge ;
  - badge **Complété** quand le vendeur a déposé une pièce alors que son dossier attendait une modification ;
  - badge **Déjà validé** quand un vendeur approuvé a une pièce à vérifier ;
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

## Un vendeur validé reste validé

- Déposer, faire vérifier ou se voir refuser une pièce ne fait plus repasser un vendeur **approuvé** en `soumis`, `en_verification` ou `modification_demandee`. Ses retraits d'argent ne sont plus bloqués, et la levée d'une sanction ne le rend plus inactif.
- Sa pièce apparaît dans **À traiter** avec le badge **Déjà validé** ; une pièce refusée lui est signalée dans son espace, son dossier reste validé.
- Migration `20261112100000_vendeurs_valides_restent_valides` : les vendeurs déjà touchés (approuvés au moins une fois, toujours actifs ou sous surveillance, mais remis en `soumis`, `en_verification` ou `modification_demandee`) retrouvent le statut `approuve`.

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

## Correctif du 13 novembre 2026 : dossiers bloqués en « Modification demandée »

- **Le défaut** : refuser une ancienne pièce après le dépôt d'une nouvelle mettait le dossier en « Modification demandée » ; la nouvelle pièce validée, il y restait, et l'écran ne proposait plus aucune décision.
- **Backend** : après chaque décision sur une pièce, le statut suit les pièces en vigueur. Une pièce en vigueur refusée met le dossier en attente du vendeur ; plus aucune, et un dossier mis en attente par une pièce (sans motif de dossier) repasse en « Soumis », dans « À traiter », marqué « Complété ». Refuser une version déjà remplacée ne bloque plus rien.
- **Migration** `20261113090000_dossiers_vendeurs_debloques` : remet dans « À traiter » les dossiers déjà bloqués de cette façon.
- **Panel** : un dossier en « Modification demandée » peut aussi être approuvé, refusé ou renvoyé au vendeur.
- **Inchangé, par décision** : l'approbation n'exige que les pièces déposées validées, pas les cinq pièces obligatoires.
