# Équipe, rôles et paramètres

Réutiliser fiche équipe, invitation, affectations et mutations existantes ; conserver les cinq rôles réels, pas de rôle inventé ni de nouvelle délégation de privilèges.

1. `app/pages/team.vue`, composants équipe : cadre mobile lisible et guide des rôles consultatif, rôles du membre mis en évidence ; conserver sauvegarde, confirmation de perte de modifications, protection du compte courant et de la dernière direction. Tests de sauvegarde et permissions existants plus guide Tester.
2. Nouvelle `app/pages/settings.vue` direction seule : hub structuré vers les vrais modules de paramètres (vitrine, livraison/localités, paiements, KATI/échelonnement, équipe et pilotage), liens FR/EN. Ajouter entrée de navigation et types/query nécessaires. Aucun faux bouton de sauvegarde ni secrets dans l’UI.
3. `BackendKati/src/administration/` : GET `/administration/systeme`, direction seule contrôlée au service et au contrôleur. Exposer fuseau et preuves minimales des fichiers optionnels SAUVEGARDE_ETAT_PATH/RESTAURATION_ETAT_PATH : états non_configuree, illisible, invalide, echec, ancienne, ok ; date et booléen hors site, jamais chemins/raisons/secrets. Ajouter date à la preuve générée par le script de restauration. Absence de preuve ne vaut jamais succès.
4. Tests backend par fichiers temporaires isolés, recette UI des états inconnus/erreurs, typecheck/lint/i18n/audit/build. Pas de changement du schéma de données.

Hypothèse : les vrais paramètres métiers sont déjà modifiables dans leurs modules ; le hub les regroupe plutôt que créer une configuration parallèle. La supervision exige des fichiers réellement montés sur le serveur pour confirmer les sauvegardes de production.
