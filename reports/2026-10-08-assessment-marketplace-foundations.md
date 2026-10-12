# Assessment — Marketplace foundations

## Question

Le socle NowTech actuel peut-il évoluer vers KatiHub, marketplace multi-vendeurs avec livraison hybride, acompte, encaissement par livreur, modération et reversements fiables ?

## Méthode

L'évaluation a examiné :

- le schéma Prisma de `BackendKati` ;
- la machine à états et la création de commande ;
- le modèle d'encaissement et de caisse ;
- les modules et contrats principaux de l'administration ;
- le panier, le catalogue et le checkout du site client ;
- les écrans de référence fournis ;
- les règles formalisées dans les documents racine KatiHub.

Elle n'a pas examiné intégralement chaque route, chaque test, les données de production, les contrats commerciaux réels, la configuration d'hébergement, ni effectué de test de charge ou de sécurité externe.

## Findings

### 1. Le socle financier actuel est réutilisable

Le backend stocke déjà les FCFA en entiers, sépare commande et encaissement, protège certaines écritures par idempotence et suit les remises de caisse avec écarts. Ces choix réduisent fortement le risque par rapport à une réécriture totale.

Evidence : `BackendKati/prisma/schema.prisma`, `BackendKati/src/caisse/caisse.service.ts`, `BackendKati/src/commandes/creation.service.ts`.

### 2. Le catalogue actuel n'est pas un socle durable de marketplace

Le schéma `nowtech` est régénéré et ne peut pas recevoir de relations durables depuis Prisma. Les vendeurs, offres, stocks et lignes de commande doivent pointer vers un catalogue possédé par KatiHub.

Evidence : commentaire de tête et relations historiques dans `BackendKati/prisma/schema.prisma`.

### 3. La commande actuelle est mono-vendeur et mono-expédition

Elle porte directement ses lignes, son livreur et son montant restant. Elle ne peut pas représenter proprement deux vendeurs, plusieurs responsabilités, deux codes de livraison ou un reversement partiel.

Evidence : modèles `Commande` et `CommandeLigne`.

### 4. La caisse actuelle est une base forte mais incomplète pour le réseau logistique

Elle sait suivre le porteur, le montant attendu, le comptage, l'écart et la validation. Elle ne modélise pas encore explicitement le transfert livreur-superviseur, les lots de dépôt et la conséquence comptable vendeur.

Evidence : modèles `Encaissement`, `RemiseCaisse`, `EcartCaisse` et service de caisse.

### 5. L'administration fournit déjà les bons patterns d'interaction

Les workspaces liste/détail, propositions, commandes, caisse, demandes client et filtrage par rôle peuvent être réutilisés. Il faut étendre leur domaine et leurs permissions, pas reconstruire le shell.

Evidence : `app/components/content/propositions/`, `app/components/orders/`, `app/components/caisse/`, `app/components/operations/CustomerRequestsWorkspace.vue`.

### 6. Le site client supporte déjà la commande invitée

Le checkout sait commander avec ou sans compte et vérifie les prix côté serveur. Le panier doit toutefois passer du produit à l'offre et le checkout doit grouper par vendeur/expédition.

Evidence : `websitekati/src/lib/cart.tsx`, `websitekati/src/app/commande/valider/ValiderCommande.tsx`.

## Recommendation

Procéder par migration additive : vendeur/boutique et catalogue durable, puis sous-commandes et registre financier, puis expéditions/caisse. NowTech devient la boutique de bootstrap. Les commandes historiques restent compatibles et ne sont pas réécrites sans preuve.

Ne pas commencer par la refonte de la page d'accueil. Le premier lot de code doit sécuriser le périmètre vendeur et la séparation Produit/Offre.

## Baseline de vérification

- `BackendKati` : `npm.cmd run build` réussi sous Node 24.
- `websitekati` : `npm.cmd run build` réussi sous Node 24. Le backend local n'était pas lancé ; les avertissements de catalogue inaccessible ont été absorbés par les états de repli et n'ont pas empêché la compilation.
- `adminkati` : Bun, gestionnaire déclaré par le dépôt, n'est pas installé sur le poste.
- `adminkati` : le typecheck lancé via les dépendances npm existantes échoue sur deux erreurs préexistantes : surcharge `$fetch` dans `app/composables/useApi.ts` et fixture incomplète dans `test/unit/ai-product-copy-service.test.ts`.
- `adminkati/package-lock.json` est non suivi alors que le dépôt désigne `bun.lock` comme seul lockfile ; son origine n'a pas été modifiée pendant l'audit.

## Scope limits

- Validation juridique et fiscale toujours requise.
- Taux définitif de commission non validé.
- Partenaire de paiement et contrats logistiques non sélectionnés.
- Valeur des Kati et affiliation volontairement hors périmètre.
- Aucun comportement applicatif n'a été modifié pendant cette évaluation.
