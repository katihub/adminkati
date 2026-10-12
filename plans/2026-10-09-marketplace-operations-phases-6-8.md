# Marketplace Operations — phases 6 à 8

## Objectif

Étendre l’espace **Opérations** existant sans changer sa charte pour rendre opérables les phases 6 à 8 du pilote marketplace : caisse, retours/remboursements/litiges et sanctions/réhabilitations. Les nouvelles surfaces réutilisent le shell, `AdminPageHeader`, `PillTabs`, les filtres Vuzeno, les listes maître/détail, les badges, les boutons et les états d’erreur déjà présents.

Référence visuelle acceptée pour l’implémentation :
`public/design-concepts/operations-litiges-responsive-2026-10-09.png`.

## Verrou de charte

- Shell existant : `AdminHeader` horizontal, aucun menu latéral, contenu centré `max-w-[1600px]`, hauteur `h-workspace`.
- Fond : vrai blanc pour l’en-tête et les surfaces ; `bg-muted/65` pour le shell ; `bg-muted/70` pour le détail.
- Typographie : Figtree pour l’interface, police heading existante pour les titres ; titre de page `text-xl sm:text-2xl`, titre détail `text-lg`.
- Navigation locale : `PillTabs` existant, rail `rounded-full bg-muted/50`, sélection blanche avec `shadow-xs` ; aucune barre verte sous les onglets.
- Espace maître/détail : colonne liste de 300 px, séparateurs `border-border`, détail flexible et scrollable.
- Ligne sélectionnée : liseré gauche `border-l-4 border-l-primary`, fond `bg-muted`, fins bordures haut/bas.
- Rayons, badges, boutons, formulaires et icônes : composants UI existants uniquement ; pas de nouvelle palette, gradient, ombre forte, sidebar, métrique décorative ou grille bento.

## Copie visible autorisée

- Page : `Opérations`.
- Onglets : `Caisses`, `Litiges et retours`, `Confiance vendeurs`.
- Litiges : `Dossiers à traiter`, `Statut`, `Type`, `Recherche`, `Résumé`, `Articles retournés`, `Historique`, `Décision`, `Note de décision`, `Valider le remboursement`, `Arbitrer`.
- Confiance : `Vendeurs à examiner`, `Historique des sanctions`, `Sanctionner`, `Confirmer`, `Lever la sanction`, `Réhabiliter`, `Motif de décision`.
- Les états, libellés de champs et messages d’erreur supplémentaires doivent provenir des contrats métier et des traductions, pas de contenu décoratif.

## Architecture fonctionnelle

### 1. Navigation Opérations

- Ajouter `marketplace-disputes` et `seller-trust` à la liste typée des onglets partageables.
- Conserver `cash-registers` par défaut et ses query params.
- Retirer la surface d’assistance client de cette page seulement si son accès historique reste assuré par sa route dédiée ; sinon la garder comme onglet distinct sans la confondre avec les litiges marketplace.
- Monter un seul workspace à la fois pour ne déclencher que les requêtes utiles.

### 2. Litiges et retours

- Ajouter les types API de liste, détail, articles, événements et capacités d’action.
- Ajouter les clés Vue Query et les composables de liste/détail/mutations.
- Construire un workspace maître/détail reprenant exactement l’anatomie caisse/commandes.
- Filtres : recherche, statut et type ; sélection sérialisée par `?retour=`.
- Détail : en-tête sticky, résumé, articles, historique et décision.
- Actions branchées aux endpoints métier : expédition du retour, réception, remboursement, contestation et arbitrage.
- Invalider liste et détail après succès ; afficher les erreurs API par le composant partagé.
- Ne jamais fabriquer de dossier ou de montant en production : états vide/chargement/erreur si l’API ne fournit rien.

### 3. Confiance vendeurs

- Ajouter les types API et composables pour la file vendeurs, le détail réputation et l’historique des sanctions.
- Sélection sérialisée par `?vendeur=`.
- Afficher le statut vendeur/boutique, les signaux de réputation et les sanctions actives/passées.
- Actions : sanction, arbitrage, levée et réhabilitation, avec motif obligatoire selon le contrat.
- Respecter les rôles et les capacités renvoyées par le serveur ; un contrôle non autorisé est absent ou désactivé avec raison.

### 4. Contrats backend nécessaires

- Exposer des lectures paginées/listables pour les retours/litiges et sanctions/réputation, en plus des commandes d’action déjà présentes.
- Les réponses de détail fournissent l’historique d’audit, les relations utiles, les montants calculés par le serveur et les actions autorisées.
- Appliquer le périmètre et les rôles côté serveur ; aucune sécurité ne dépend de l’interface.
- Employer le pattern `Result` attendu par le projet pour les nouvelles routes frontend/server.

### 5. Responsive

- Desktop : filtre puis grille `300px / 1fr`.
- Mobile : liste et détail mutuellement exclusifs ; le détail possède un bouton Retour ; les onglets restent les `PillTabs` horizontalement scrollables.
- Les actions essentielles restent visibles sans recouvrir le contenu et les tableaux passent dans un conteneur horizontal contrôlé.
- Aucun débordement horizontal de page à 360–390 px.

## Plan TDD

1. Étendre d’abord les tests de page pour le routage des nouveaux onglets et leur montage exclusif.
2. Ajouter des tests de workspace pour liste, sélection, URL, chargement, vide et erreur.
3. Ajouter des tests de mutations pour chaque transition autorisée et l’invalidation des données.
4. Ajouter les tests backend de liste/détail, périmètre, rôles et calcul des capacités.
5. Implémenter le minimum nécessaire jusqu’au vert, puis refactorer autour des primitives existantes.

## Validation

- Tests ciblés Nuxt/unit puis suite pertinente.
- Typecheck, lint et build frontend.
- Tests ciblés puis build backend ; validation Prisma.
- Validation visuelle desktop et mobile dans Browser/IAB ; si indisponible, Playwright avec Chrome local et motif documenté.
- Comparaison par `view_image` du concept accepté et des dernières captures.
- Ledger final : shell/navigation, onglets, largeur liste, sélection, typographie, palette, détails/actions et comportement mobile.
- Diff de copie visible au-dessus de la ligne de flottaison ; aucune copie ou composant majeur non prévu.

## Hors périmètre et garde-fous pilote

- Aucun lancement Kati, affiliation ou Services.
- Aucun changement de charte globale.
- Le pilote reste limité à Douala et dépend de la finalisation juridique de la phase 0.
- Les données d’exemple du concept ne deviennent jamais des données codées en dur dans l’application.
