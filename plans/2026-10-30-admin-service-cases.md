# Plan — Fiche SAV et litiges

Consolider le workspace retours existant : contexte commande/client/boutique, pièces, échanges horodatés, décisions, remboursement et historique. Conserver les capacités serveur pour toutes les actions.

Travail : rendre les sections accessibles depuis une navigation locale ; supprimer la possibilité de répondre à un dossier fermé ; réinitialiser tous les champs et erreurs au changement de dossier ; sécuriser les frais entiers positifs ; ajouter pagination et lecture des références PSP. Préserver l'export et le téléchargement authentifié des preuves.

Fichiers : `MarketplaceDisputesWorkspace.vue`, composants opérations associés, types et traductions. Contrats : `/marketplace/demandes-client/retours[/:id]`, mutations existantes. Tests : capacités, dossier fermé, changements de dossier, erreurs, pagination et mobile.

Terminé quand toutes les informations existantes sont accessibles dans la fiche et que les actions invalides ne sont plus proposées.
