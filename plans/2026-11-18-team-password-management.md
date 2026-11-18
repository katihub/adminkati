# Gestion des mots de passe de l’équipe

## Besoin

La direction ou le gestionnaire qui crée un membre de l’équipe KatiMarket choisit son mot de passe initial. Depuis la fiche d’un membre existant qu’il peut gérer, il peut également définir un nouveau mot de passe. Le secret n’est jamais renvoyé par l’API, journalisé ni conservé dans la base métier.

## Réutilisation

- `TeamHireDialog` et `TeamHireForm` pour l’embauche.
- `TeamManagementActions` et les composants de dialogue existants pour l’action sur une fiche.
- `useTeamMutations` et `useApiWrite` pour les écritures.
- Le service Supabase déjà utilisé par `InvitationsCompteService` pour créer les accès de l’équipe.
- Le journal métier de `EquipeService` pour tracer l’auteur de l’action sans enregistrer le secret.

## Contrats

- `POST /equipe/membres` accepte `motDePasse: string` (8 à 200 caractères), crée ou rattache l’identité Supabase et pose ce mot de passe.
- `PUT /equipe/membres/:id/mot-de-passe` accepte `{ motDePasse: string }` et répond `{ motDePasseModifie: true }`.
- Les deux routes restent réservées aux rôles `direction` et `gestionnaire`, avec les restrictions existantes sur les membres réservés à la direction.

## Étapes

1. Ajouter les validations et les opérations Supabase dans `BackendKati/src/equipe/`, avec tests de création, modification, autorisation et absence du secret dans le journal. Terminé quand les tests ciblés Jest passent.
2. Étendre les types et mutations dans `adminkati/app/types/api/equipe.ts` et `adminkati/app/composables/useTeamMutations.ts`. Terminé quand le typecheck accepte les nouveaux contrats.
3. Ajouter un champ mot de passe confirmé à l’embauche et un dialogue de modification sur la fiche dans `adminkati/app/components/team/`. Les états attente, validation et erreur restent visibles dans les dialogues. Terminé quand les tests de composants couvrent le succès et les erreurs de validation.
4. Vérifier l’ensemble avec les tests ciblés, le lint, le typecheck et le build des deux projets.

## Tests

- Validation de longueur et confirmation côté panel.
- Le mot de passe est transmis à la création et peut être changé sur une fiche.
- Supabase crée l’identité avec le secret ou met à jour l’identité exacte existante.
- Un gestionnaire ne peut pas modifier le mot de passe d’un membre portant un rôle réservé à la direction.
- Le journal contient l’action, jamais le mot de passe.

## Risques et hypothèses

- Le mot de passe choisi par l’administrateur est définitif : aucun changement forcé à la première connexion, conformément à la demande.
- Une adresse déjà connue de Supabase représente la même identité KatiMarket ; son mot de passe est donc mis à jour après correspondance exacte de l’adresse.
- Les e-mails d’invitation ne sont plus nécessaires quand un mot de passe est fourni ; le membre reçoit uniquement son identifiant par un canal que l’administrateur choisit.
