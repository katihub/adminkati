# Arbitrages et espaces litiges marketplace — réalisation

## Livré

- API de lecture des dossiers par boutique avec contrôle des rôles et capacités calculées côté serveur.
- Transitions atomiques décision, expédition, réception, contestation et arbitrage, chacune inscrite dans l'historique.
- Contestation limitée à la partie lésée : refus côté client, autorisation côté vendeur.
- Pièces internes rendues inaccessibles au vendeur comme au client.
- Espace client : réponse, ajout de preuves sur son propre message, déclaration d'expédition et contestation.
- Espace vendeur : file des litiges, échanges, preuves, décision motivée, réception et contestation.
- Super-admin : échanges, décision initiale, responsabilité, frais et arbitrage définitif, en plus du remboursement Fapshi existant.
- Libellés super-admin disponibles en français et en anglais.

## Vérifications

- Backend : build réussi ; 3 suites litiges, 15 tests réussis.
- Marketplace : typecheck, lint et build de production réussis (39 pages).
- Super-admin : typecheck, lint et contrôle i18n réussis.
- Super-admin : compilation client et serveur réussie ; packaging Nitro interrompu après une attente prolongée sans erreur applicative (avertissements de dépendances existants uniquement).
- Playwright vendeur : rendu desktop 1440×900 et mobile 390×844, navigation vers l'onglet, dossier et actions visibles, aucune erreur console.

## Limite externe

La certification Fapshi en production reste conditionnée aux identifiants payout live, à l'activation Fapshi et à une opération contrôlée réelle, conformément au runbook déjà livré.
