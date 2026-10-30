# Plan — Modernisation du workspace Commandes et Devis

## Objectif

Appliquer le système visuel du programme de modernisation au module Commerce. Préserver les contrats, les permissions et toutes les actions existantes.

## Constat

`orders.vue` impose un workspace plein écran à une colonne sur téléphone, avec deux panneaux de hauteur complète. Le passage Devis n'ajoute pas de marqueur query et `quote=1`, utilisé par la sidebar, est interprété comme une référence de devis. Les dates réelles de la commande existent dans `CommandeDetail` mais ne sont pas rassemblées.

## Travail

1. Corriger la synchronisation URL/onglet et traiter `quote=1` comme marqueur de liste ; garder les références DV existantes.
2. Encadrer le workspace avec le même rayon/bordure que Produits ; rail 320 px sur desktop, liste de hauteur bornée puis détail sur mobile. Appliquer ce comportement au workspace Devis.
3. Afficher un panneau chronologique basé uniquement sur `creeLe`, `livreurAffecteLe`, `recuLe`, `closeLe`, sans inventer de date de transition. Ajouter le motif de clôture disponible.
4. Traiter l'erreur de liste dans le panneau large avec retry au lieu d'afficher un simple vide.
5. Vérifier les routes, rôles, informations financières masquées, états vides/erreurs et navigateur desktop/mobile.

## Fichiers

`app/pages/orders.vue`, `app/components/orders/DetailPanel.vue`, `app/components/orders/RecordedEvents/RecordedEvents.vue`, `app/components/quotes/Workspace.vue`, traductions FR/EN et tests composants existants/nouveaux.

## Critères d'acceptation

Les onglets survivent au rechargement et aux retours navigateur. Le raccourci Devis ne demande jamais `/devis/1`. La fiche reste atteignable à 390 px. Les événements non datés ne sont pas prétendus accomplis. Aucune donnée financière ou action supplémentaire n'est exposée à un rôle restreint.
