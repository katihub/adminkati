# Modèle opérationnel du cockpit Direction

Ce document décrit les responsabilités affichées dans l’administration KatiHub. Les domaines de navigation organisent le travail ; ils ne créent pas de nouveaux rôles techniques. Les autorisations restent `direction`, `comptoir`, `preparation` et `livreur`.

## Domaines et responsabilités

| Domaine | Responsabilité quotidienne | Décisions principales | Destination |
| :-- | :-- | :-- | :-- |
| Pilotage | Prioriser les files et surveiller la marketplace | Arbitrer, escalader, affecter | `/` |
| Commerce | Suivre commandes et devis | Débloquer, annuler, traiter les exceptions | `/orders` |
| Catalogue | Maintenir produits, taxonomie et offres | Publier, corriger, refuser | `/products` |
| Vendeurs | Gérer l’onboarding et la confiance | Valider, suspendre, réhabiliter | `/operations?tab=seller-onboarding` |
| Clients | Gérer les demandes, avis et litiges | Répondre, arbitrer, modérer | `/users` |
| Logistique | Paramétrer la desserte et les tarifs | Activer les zones, contrôler les opérateurs | `/operations?tab=delivery-fees` |
| Finance | Suivre caisses, commissions et écarts | Autoriser, rapprocher, contrôler | `/operations?tab=seller-finance` |
| Marketing | Gérer contenu et communications | Publier, ordonner, notifier | `/content` |
| Administration | Gérer équipe et conformité de plateforme | Administrer les accès et la configuration | `/team` |

## Files du cockpit

Les délais sont des cibles internes proposées. Ils ne mesurent pas l’âge réel d’un dossier : l’API agrégée ne fournit pas encore les dates individuelles.

| File | Source du volume | Priorité | Responsable | SLA cible | Destination |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Commandes à examiner | statut `attention` | Critique | Commerce | 4 h ouvrées | `/orders` |
| Vendeurs à valider | `approvals.sellers` | Élevée | Vendeurs | 2 jours ouvrés | `/operations?tab=seller-onboarding` |
| Produits à modérer | `approvals.products` | Élevée | Catalogue | 1 jour ouvré | `/operations?tab=marketplace-catalogue` |
| Offres à modérer | `approvals.offers` | Élevée | Catalogue | 1 jour ouvré | `/operations?tab=marketplace-catalogue` |
| Litiges ouverts | `kpis.openDisputes.valeur` | Critique | Clients | 72 h | `/operations?tab=marketplace-disputes` |
| Écarts de caisse | alerte `cash_disputes` | Élevée | Finance | 1 jour ouvré | `/operations` |

L’alerte agrégée `pending_approvals` ne devient pas une file supplémentaire, car elle recouvre déjà les validations vendeurs, produits et offres. Les files à zéro sont masquées ; lorsque toutes sont vides, le cockpit affiche un état calme.

## Données encore nécessaires

Le calcul d’un SLA réel demandera ultérieurement les dates d’entrée en file, le responsable affecté, le statut de traitement et la date de résolution de chaque dossier. Les risques de commande, rapprochements de paiement et taux de livraison à l’heure ne doivent pas être affichés avant l’existence de contrats API fiables.
