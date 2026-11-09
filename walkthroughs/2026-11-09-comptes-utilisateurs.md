# Compte rendu : l'équipe aide un client ou un vendeur à retrouver l'accès à son compte

Plan : `plans/2026-11-09-comptes-utilisateurs.md`.

## Résultat

- **Page « Comptes utilisateurs »** (`/comptes`, menu Clients), pour la direction et les points focaux :
  - une recherche par e-mail, nom ou téléphone (3 caractères au moins) ;
  - la liste des clients et des vendeurs. Pour un point focal, seulement les membres de ses boutiques ;
  - la fiche du compte choisi, avec les actions.
- **Panneau « Accès au compte »**, réutilisé à trois endroits : la page Comptes, la fiche client de l'Annuaire (direction) et chaque membre d'une boutique, avec un bouton « Accès au compte » dans le dossier vendeur.
- **Ce que montre le panneau** :
  - client, vendeur ou les deux ;
  - e-mail confirmé ou non ;
  - dernière connexion ;
  - compte bloqué, le cas échéant ;
  - les boutiques ;
  - les seules actions permises à l'appelant.
- **Les quatre actions** :
  1. **Envoyer un lien de réinitialisation** : un e-mail KatiMarket, envoyé par le SMTP du serveur, avec le bouton « Choisir mon mot de passe ». Le lien vaut une heure, pour un seul usage. Il mène à la page vendeur ou client du site.
  2. **Confirmer l'e-mail** : le bouton disparaît quand l'e-mail est déjà confirmé.
  3. **Copier un lien à transmettre** : il demande un motif. Le lien s'affiche une seule fois, avec un bouton Copier.
  4. **Mot de passe temporaire** : réservé à la direction, avec motif. Le serveur génère 14 caractères lisibles (ni 0/O ni 1/l/I), affichés une seule fois. À la connexion suivante, le site envoie la personne choisir son propre mot de passe.
- **Journal** : `compte.lien_envoye`, `compte.courriel_confirme`, `compte.lien_genere`, `compte.mot_de_passe_temporaire`. On y trouve l'auteur, le compte visé, le motif et les boutiques, mais jamais le lien ni le mot de passe.
- **E-mail d'information** à l'utilisateur après les actions 2, 3 et 4 : « L'équipe KatiMarket a modifié l'accès à votre compte… Si vous n'avez rien demandé, contactez-nous. »
- **Refusé** :
  - un compte de l'équipe (« gérez-le depuis Équipe ») ;
  - une adresse inconnue de KatiMarket ;
  - une boutique hors du périmètre du point focal ;
  - le mot de passe temporaire pour un point focal ;
  - toute action pour le comptoir.

## Fichiers

- **BackendKati** : le module `src/comptes/` (`SupabaseAdminService`, `ComptesService`, contrôleur `/comptes`, DTO).
  - Le compte Supabase est cherché d'abord par son identifiant, quand KatiMarket le connaît (client, vendeur déjà connecté), puis par e-mail.
- **adminkati** :
  - la page `pages/comptes.vue` ;
  - `components/accounts/AccountAccessPanel.vue`, `composables/useAccounts.ts`, `utils/account-access.ts` et les types `accounts.ts` ;
  - l'intégration dans `ProfileTab` et `ShopMembers` ;
  - l'entrée de menu « Comptes utilisateurs ».
- **websitekati** :
  - `lib/mot-de-passe-temporaire.ts` ;
  - les connexions client et vendeur ;
  - `PasswordRecovery`, avec le message « mot de passe temporaire » et l'effacement du marqueur à l'enregistrement.

## Tests

- **BackendKati** :
  - `comptes.service.spec.ts` (14 tests) : droits, périmètre, exclusions, motif, journal sans secret, e-mails ;
  - `supabase-admin.service.spec.ts` (4 tests) : recherche par identifiant puis par e-mail exact, formes du lien, marqueur, erreurs.
- **adminkati** : `account-access.test.ts` (4 tests), `account-access-panel.test.ts` (2 tests d'écran), plus la navigation mise à jour. Le point focal voit maintenant le groupe Clients.
- **websitekati** : `qa/mot-de-passe-temporaire.test.mjs`.
- **Échecs qui existaient déjà** : backend (export PDF, devis, notifications), panel (palette), site (`connexion.spec:20`).

## À vérifier après la mise en ligne

- **Une seule fois, avec un vrai compte de test** : envoyer un lien, puis le suivre jusqu'au nouveau mot de passe. La recherche par e-mail de Supabase n'a pas pu être essayée sur la production depuis le poste de développement.
- L'application mobile n'oblige pas encore à changer un mot de passe temporaire.
