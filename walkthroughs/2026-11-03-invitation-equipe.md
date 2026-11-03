# Walkthrough : invitation des membres de l'équipe et mot de passe du panel

## Problème

Inscrire un membre de l'équipe (direction, comptoir, livraison, point focal) ne lui permettait pas de se connecter :
- l'invitation partait par le serveur d'e-mail du backend, et elle ne partait pas. Les variables d'envoi sont correctes dans Coolify, mais la cause du refus n'a pas été trouvée ;
- même reçue, elle ne servait à rien : **aucun compte de connexion n'était créé**, et le panel n'offrait aucun moyen de choisir un mot de passe. La page « Mot de passe oublié » affichait « pas encore disponible » ;
- le texte parlait encore de « NowTech Center ».

## Résultat

1. **Inscription d'un membre** (Équipe → Inscrire un membre) :
   - **Supabase crée le compte** et envoie l'e-mail **« Bienvenue dans l'équipe KatiMarket »**, en français, avec le bouton **« Choisir mon mot de passe »** ;
   - si l'adresse a déjà un compte (un client qui rejoint l'équipe), il reçoit à la place le lien de réinitialisation, qui mène à la même page ;
   - si Supabase échoue, l'ancien e-mail du backend part en secours, désormais au nom de KatiMarket.
2. **Page « Choisir mon mot de passe »** : `/fr/choisir-mot-de-passe` et `/choose-password`.
   - Elle lit le jeton du lien, puis le retire de la barre d'adresse.
   - Elle demande le mot de passe deux fois (8 caractères au moins), puis propose de se connecter.
   - Un lien expiré ou invalide propose d'en recevoir un nouveau.
3. **Page « Mot de passe oublié »**, désormais fonctionnelle : elle demande l'e-mail, et Supabase envoie le lien vers la page ci-dessus. La réponse est la même que l'adresse existe ou non.
4. **Bouton « Renvoyer l'invitation »** dans la fiche d'un membre actif qui ne s'est jamais connecté.

## Modifications

- **BackendKati** :
  - `src/equipe/invitations-compte.service.ts` (nouveau) : appels à `/auth/v1/invite`, puis à `/auth/v1/recover` si le compte existe déjà ;
  - `equipe.service.ts` : branchement de l'invitation, `renvoyerInvitation` et textes au nom de KatiMarket ;
  - `equipe.controller.ts` : route `POST /equipe/membres/:id/invitation` ;
  - `config` : `SUPABASE_SERVICE_ROLE_KEY` ;
  - tests : 37 sur 37.
- **adminkati** :
  - pages `choisir-mot-de-passe.vue` et `forgot-password.vue` ;
  - routes serveur `api/auth/password-reset` et `api/auth/password` ;
  - `TeamResendInvitation` et `useTeamMutations` ;
  - tests `password-flows` et `team-workspace` : 10 sur 10.
- **websitekati** : modèle `public/emails/invitation-equipe.html`.

## À configurer en production

1. **Backend (Coolify)** : `SUPABASE_SERVICE_ROLE_KEY` = la clé de service de Supabase (`SERVICE_SUPABASESERVICE_KEY`), et `URL_PANEL=https://admin.katimarket.com` si elle n'y est pas.
2. **Supabase (Coolify)** :
   - `MAILER_TEMPLATES_INVITE=https://www.katimarket.com/emails/invitation-equipe.html` ;
   - `MAILER_SUBJECTS_INVITE=Bienvenue dans l'équipe KatiMarket` ;
   - **ajouter `https://admin.katimarket.com/**` à `ADDITIONAL_REDIRECT_URLS`**. Sans cela, les liens renvoient vers le site au lieu du panel.
   - Puis « Redeploy ».
3. **Déploiement** : le backend, le panel, puis le site, pour mettre le modèle en ligne.
