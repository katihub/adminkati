# Plan : l'équipe aide un client ou un vendeur à retrouver l'accès à son compte

## Besoin (décidé le 9 novembre 2026)

Une page **Comptes utilisateurs** dans le panel, plus les mêmes boutons sur les fiches existantes : la fiche client (Annuaire) et les membres d'une boutique (dossier vendeur).

Les quatre actions :

| # | Action | Ce qui se passe |
| :-- | :-- | :-- |
| 1 | **Envoyer un lien de réinitialisation** | Un e-mail KatiMarket part, avec un lien. L'utilisateur choisit lui-même son mot de passe. |
| 2 | **Confirmer l'e-mail** | Le compte Supabase est marqué confirmé : l'utilisateur peut se connecter sans l'e-mail de confirmation. |
| 3 | **Copier un lien à transmettre** | Le panel affiche un lien de réinitialisation (une heure, un seul usage), que l'équipe envoie par WhatsApp. |
| 4 | **Définir un mot de passe temporaire** | Le serveur génère un mot de passe solide, affiché une seule fois. À la connexion suivante, le site oblige à en choisir un nouveau. |

Qui fait quoi :

| Rôle | Comptes visés | Actions |
| :-- | :-- | :-- |
| Direction | clients et vendeurs | 1, 2, 3 et 4 |
| Point focal | les membres des boutiques qui lui sont assignées | 1, 2 et 3 |
| Comptoir et autres | aucun | aucune |

## Garde-fous

- **Motif obligatoire** pour les actions 3 et 4.
- **Chaque action est inscrite au journal** : `compte.lien_envoye`, `compte.courriel_confirme`, `compte.lien_genere`, `compte.mot_de_passe_temporaire`. Le journal garde l'auteur, le compte visé et le motif.
- **L'utilisateur est prévenu par e-mail** : l'action 1 est elle-même l'e-mail. Pour 2, 3 et 4, un e-mail l'informe que l'équipe a agi sur son accès, et lui dit de nous contacter s'il n'a rien demandé.
- **Les comptes de l'équipe sont exclus**, direction comprise. Ils se gèrent depuis Équipe, comme avant.
- **Seul un compte connu de KatiMarket est visé** (client, ou membre d'une boutique), jamais une adresse quelconque de Supabase.
- **Le mot de passe temporaire** n'est ni enregistré, ni écrit au journal. Il est affiché une seule fois.
- Les routes sont **limitées en débit**.

## Étapes

1. **Backend** (BackendKati, TDD), module `comptes` :
   - `SupabaseAdminService` utilise la clé de service. Il permet de :
     - trouver un compte par e-mail ;
     - générer un lien de réinitialisation (`admin/generate_link`, type `recovery`) ;
     - confirmer l'e-mail ;
     - poser un mot de passe, avec `user_metadata.doit_changer_mot_de_passe = true`.
   - `ComptesService` :
     - `rechercher(q)` : 3 caractères au moins, par e-mail, nom ou téléphone, dans les clients et les membres des boutiques (les seules boutiques du point focal) ;
     - chaque compte trouvé indique :
       - son état de connexion (existe, e-mail confirmé, dernière connexion) ;
       - ses rôles ;
       - les actions permises à l'appelant ;
     - `agir(courriel, action, motif)` ;
     - le lien renvoie vers `/reinitialiser-mot-de-passe` pour un vendeur, `/nouveau-mot-de-passe` pour un client.
   - Les routes :
     - `GET /comptes?q=` ;
     - `GET /comptes/detail?courriel=` ;
     - `POST /comptes/lien-reinitialisation` ;
     - `POST /comptes/confirmer-courriel` ;
     - `POST /comptes/lien-a-transmettre` ;
     - `POST /comptes/mot-de-passe-temporaire`.
2. **Panel** (adminkati, TDD) :
   - la page `/comptes` « Comptes utilisateurs » (recherche, fiche, actions), dans le menu Clients, pour la direction et le point focal ;
   - le composant `AccountAccessPanel` (état et boutons, d'après un e-mail), réutilisé :
     - sur la fiche client (Annuaire) ;
     - sur chaque membre d'une boutique (`ShopMembers`, dans une fenêtre) ;
   - une fenêtre de confirmation pour chaque action. Les actions 3 et 4 demandent un motif ; le lien ou le mot de passe s'affiche une seule fois, avec un bouton Copier.
3. **Site** (websitekati) :
   - à la connexion (client ou vendeur), un compte qui porte `doit_changer_mot_de_passe` est envoyé vers la page « Nouveau mot de passe », avec un message ;
   - l'enregistrement du nouveau mot de passe efface ce marqueur.
4. **Tests** : Jest pour le backend (droits, périmètre du point focal, journal, exclusions), Vitest pour le panel, `node --test` et e2e pour le site.

## Hors périmètre

- L'application mobile : le passage obligatoire par « nouveau mot de passe » n'y est pas ajouté. Le mot de passe temporaire y fonctionne, mais sans cette obligation.
- Les comptes de l'équipe : ils se gèrent dans Équipe.
