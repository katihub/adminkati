# Tarifs de livraison par quartier

## Objectif

Remplacer la grille de frais par ville par une grille administrable par quartier. À la commande, le client voit le tarif du quartier sélectionné avant de confirmer. L’expédition en agence reste payable intégralement à la commande et coûte 10 % de la valeur totale des produits de la commande.

## Réutilisation

- Backend : `TarifsLivraisonService`, `LocalitesService`, `planifierCommandeMarketplace` et le workflow transactionnel existant de création de commande.
- Admin : `DeliveryFeesWorkspace.vue`, `useDeliveryFees.ts`, les composables/types de localités et les composants existants d’erreur, d’état vide et de mutation.
- Boutique : `useTarifsLivraison.ts`, `MarketplaceCheckout.tsx`, le hook de localités et les calculs de règlement existants.
- Les quartiers ont déjà des identifiants stables et une relation parent-ville dans `LocaliteQuartier`.

## Décisions et hypothèses

- Les tarifs fixes administrables sont indexés par `quartierId + mode` pour Kati Express et la livraison par la boutique. Le seuil de gratuité existant reste facultatif et s’applique au sous-total de la boutique.
- Le retrait reste gratuit. Il n’a pas de ligne de tarif.
- L’agence n’a plus de tarif fixe en ville ni en quartier : dès qu’au moins une boutique utilise ce mode, les frais d’agence représentent 10 % du total produits de la commande, tous articles confondus. Cette somme est ventilée entre les sous-commandes en agence au prorata de leurs montants pour conserver les écritures par boutique, sans la compter plusieurs fois. Arrondi au FCFA supérieur.
- Les commandes comportant une expédition en agence restent obligatoirement payées intégralement à la commande ; cette règle serveur et l’indication du checkout sont conservées.
- Une livraison à domicile n’est pas disponible pour un quartier sans tarif actif pour le mode. Un texte de quartier libre ne permet donc pas de commander avant création de son tarif.
- Migration des anciens tarifs ville : créer pour chacun des quartiers existants de la ville une ligne initiale par mode de livraison à domicile, en reprenant son montant, son seuil et son état actif. Garder les lignes héritées sans quartier à titre de sauvegarde, mais ne plus les exposer ni les utiliser. Les lignes héritées « agence » ne sont pas copiées.

## Contrats de données

- `GET /marketplace/livraison/tarifs` (public) retourne uniquement des tarifs de quartier actifs : `{ id, quartierId, quartier, ville, mode, montantFcfa, gratuitDesFcfa }`.
- `GET /marketplace/livraison/tarifs/administration` inclut les quartiers inactifs et leur ville pour l’admin.
- `POST /marketplace/livraison/tarifs` accepte `{ quartierId, mode, montantFcfa, gratuitDesFcfa? }`; la ville est résolue depuis le quartier, jamais saisie comme clé tarifaire. `PATCH` conserve montant, seuil et activation ; `DELETE` reste disponible.
- La liste publique des localités expose l’identifiant de quartier, son nom et sa ville. Le checkout envoie `adresse.quartierId` en plus du nom lisible existant pour les modes à domicile.
- L’API de commande recalcule les tarifs à partir du quartier lié à la ville côté serveur. Le montant soumis comme `fraisLivraisonAttendusFcfa` est toujours comparé au calcul serveur, y compris l’agence.
- La formule agence est `ceil(totalProduitsFcfa * 0.10)` une fois par commande avec agence. Le frais est ventilé sur les groupes agence par montant produit ; le retrait et les seuils de gratuité ne changent pas cette règle.

## Phases

### 1. Persistance et migration

- Ajouter la relation facultative `quartierId` sur `TarifLivraisonMarketplace` vers `LocaliteQuartier`, avec unicité quartier/mode permettant de conserver les anciennes lignes de ville sans quartier. Ajouter une migration SQL qui clone les tarifs historiques domicile vers les quartiers existants de leur ville, ignore l’agence et conserve les lignes historiques pour retour arrière.
- Où : `BackendKati/prisma/schema.prisma`, nouveau `BackendKati/prisma/migrations/<date>_tarifs_livraison_quartier/migration.sql`.
- Terminé quand `prisma validate` et `prisma generate` passent et que la migration préserve les tarifs historiques, copie le prix/seuil/état au bon quartier et est idempotente.

### 2. Contrat API et calcul autoritaire

- Remplacer la création tarifée par ville par `quartierId`; ignorer les lignes héritées des réponses publiques et admin; autoriser uniquement les modes domestiques dans cette grille. Résoudre/valider le quartier actif, faire apparaître son nom/ville dans les réponses et journaux, garder le contrôle de rôle direction et les erreurs de conflit.
- Exposer les IDs dans `LocalitesService.listerActives`. Pour les commandes domicile, valider que `quartierId` appartient à la ville envoyée et qu’il est actif. Calculer Kati Express/boutique depuis le quartier; calculer l’agence à 10 % une seule fois du total produits, ventilé aux groupes agence. Garder intacte la validation du paiement complet agence.
- Où : `BackendKati/src/marketplace/livraisons/tarifs-livraison.ts`, `localites.ts`, `BackendKati/src/marketplace/commandes/commande-marketplace.dto.ts`, `planifier-commande.ts`, `creation-commande-marketplace.service.ts` et leurs specs.
- Terminé quand un tarif ville hérité ne peut plus autoriser une commande, qu’un tarif de quartier détermine les frais, que l’agence calcule exactement 10 % une fois et qu’une commande agence en acompte reste refusée.

### 3. Admin

- Faire gérer les tarifs sous les quartiers existants : groupe ville/quartier, deux modes tarifés, montant/seuil, actif/inactif, création/édition/suppression. Retirer l’agence de la grille fixe et afficher clairement que son coût est une règle de 10 % par commande. Fournir les états chargement, erreur/réessai, vide et mutation déjà employés.
- Adapter types et mutations admin à `quartierId` et au DTO public mis à jour.
- Où : `adminkati/app/components/operations/DeliveryFeesWorkspace.vue`, `app/composables/useDeliveryFees.ts`, types admin de localités/tarifs, `test/nuxt/delivery-fees-workspace.test.ts`, et traductions opérations FR/EN.
- Terminé quand la direction peut configurer deux prix distincts pour deux quartiers de la même ville, sans formulaire de prix par ville ni d’agence.

### 4. Checkout

- Utiliser les IDs des quartiers fournis par l’API. Dès qu’un quartier est sélectionné, recalculer les deux modes domicile à partir du quartier et afficher leurs montants; le récapitulatif s’actualise sans validation supplémentaire. Garder le cas « autre quartier » indisponible tant qu’aucun tarif n’existe.
- Afficher les frais d’agence selon le calcul serveur attendu (10 % de la valeur produits de la commande, une seule fois) et signaler le paiement complet imposé. Envoyer `quartierId`, nom et ville, et transmettre le total des frais recalculés.
- Où : `websitekati/src/components/marketplace/checkout/useTarifsLivraison.ts`, `MarketplaceCheckout.tsx`, types/adaptateurs localités concernés et tests checkout existants ou nouveaux.
- Terminé quand changer de quartier change visiblement les frais, un quartier sans tarif bloque le mode domicile, et sélectionner l’agence affiche le coût prévu tout en imposant le paiement complet.

## Tests

- Backend : DTO/service de tarifs (quartier obligatoire, modes autorisés, rôle, conflit), calcul pur (quartier distinct, inactif/absent, seuil, 10 % avec arrondi, ventilation stable), validation ville/quartier, agence paiement complet et frais attendus modifiés. Test de migration ou vérification SQL ciblée pour le clonage et la conservation des lignes héritées.
- Admin : tests composants ciblés pour choix du quartier, absence du mode agence fixe, CRUD au quartier et états d’erreur/vide.
- Boutique : tests ciblés pour recalcul et affichage immédiat au changement de quartier, frais agence une seule fois, impossibilité de livraison sans tarif et payload envoyé.
- Qualité : lancer les commandes de test/typecheck/lint des trois dépôts selon leurs scripts; faire une vérification rendue du checkout si un serveur et un parcours de données sont disponibles.

## Risques

- La migration ne peut cloner un tarif ville vers aucun quartier si les listes de localités ne sont pas présentes au moment de la migration; les modes concernés resteront indisponibles jusqu’à configuration par la direction.
- Le tarif agence devient une règle de plateforme (10 %) et non une valeur modifiable par l’admin; l’admin ne pourra pas la changer sans évolution distincte.
- Les adresses enregistrées préexistantes ne contiennent qu’un nom de quartier. Leur ID devra être résolu de manière non ambiguë selon la ville; les valeurs non correspondantes ne devront pas être converties silencieusement en livraison gratuite.
- La ventilation du frais agence entre boutiques exige un total FCFA exact et sûr; elle ne doit ni doubler les 10 % ni perdre un FCFA par arrondi.

## Questions ouvertes

- Aucune question bloquante. Interprétation retenue de « 10 % de la valeur de la commande » : inclure tous les produits du panier dès qu’au moins une boutique choisit l’agence, même si d’autres sous-commandes utilisent un autre mode; ventiler la somme uniquement entre les groupes expédiés en agence. Si l’intention est 10 % des seuls produits expédiés en agence, la base de calcul devra être limitée à ces sous-commandes.
