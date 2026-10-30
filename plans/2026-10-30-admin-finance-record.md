# Plan — Finance administrative

Compléter retraits, décisions, versements PSP et justificatifs par une synthèse financière de boutique : soldes disponibles/gelés, écritures, commissions et références sources.

Exposer la lecture existante par une route dédiée `GET /marketplace/finance/administration/boutiques/:id`, réservée direction, sans élargir la route vendeur. Réutiliser les calculs de soldes et les transactions existants ; ajouter les dates et preuves de décision/versement déjà présentes. La consultation est tracée.

Frontend : choix de boutique, synthèse, pagination des retraits et filtres ; erreurs de mutations visibles ; téléchargement privé authentifié des preuves avec état antivirus ; validations et état pending pour les décisions. Aucun paiement réel n'est exécuté en recette.

Tests : gardes backend, contrat synthèse, filtre boutique, états PSP et justificatifs, absence d'actions sur statuts terminaux, locale FR/EN et mobile.
