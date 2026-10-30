# Plan — Fiche vendeur et boutiques

Compléter la fiche existante à partir des données réelles déjà renvoyées par `/vendeurs/:id` : identité légale, statut, commission, KYC, description des boutiques, villes, livraison, gestion SAV, membres et point focal.

Ajouter dans la même fiche la qualité et les sanctions depuis `/marketplace/reputation/vendeurs/:id`, ainsi que les offres de boutique depuis `/marketplace/administration/offres?boutiqueId=...` pour la direction. Réutiliser les décisions KYC existantes et conserver les droits direction/point focal.

Fichiers : `SellerOnboardingWorkspace.vue`, nouveaux panneaux boutique et qualité, types marketplace et composables existants. Tests : champs présents/absents, droits du catalogue, choix SAV, erreurs de sections et navigation des boutiques.

Aucune donnée fictive ni modification automatique du choix SAV. Terminé quand l'agent consulte les boutiques, membres, produits et qualité sans perdre le vendeur sélectionné.
