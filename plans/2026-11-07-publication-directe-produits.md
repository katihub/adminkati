# Plan : un produit soumis est publié tout de suite, l'équipe contrôle après

## Besoin (décidé le 7 novembre 2026)

- Un produit soumis par une boutique s'affiche **immédiatement**, avec son prix et ses photos. Il en va de même pour ses modifications.
- L'équipe Kati est **prévenue** et peut agir après coup :
  - **masquer** le produit, par défaut, ce qui se rétablit ;
  - **modifier** la fiche ;
  - **demander une correction** au vendeur, avec un motif ;
  - **supprimer** le produit, réservé aux cas graves.
- Les vendeurs **sous surveillance** restent soumis à la validation avant publication.
- Le vendeur ne voit plus la notion d'« offre » : tout se gère dans **Produits**.
- Un produit sans prix est signalé au vendeur, qui le complète sur place.
- Les photos : une indication discrète des dimensions, et un avertissement (non bloquant) si la photo est trop petite ou trop allongée.
- Au lancement :
  - ce qui attend une validation est publié ;
  - les boutiques qui ont des produits sans prix sont notifiées.

## Ce que ça change ailleurs (à accepter avant de coder)

1. Fin de la validation préalable pour les boutiques actives. Un produit interdit ou trompeur est visible tant que l'équipe ne l'a pas masqué.
2. La file « Modération » de l'admin devient « Produits à contrôler ». Elle sert à contrôler, plus à autoriser.
3. Une modification de prix, de texte ou de photo par le vendeur est en ligne tout de suite. Aujourd'hui, le texte et les photos repassent en validation.
4. L'onglet **Offres** de l'espace vendeur disparaît. Son formulaire « créer une offre » est remplacé par « Ajouter un prix » dans la liste des produits.
5. Un produit masqué par l'équipe ne se rétablit pas par le vendeur : seule l'équipe le rétablit.
6. Le badge « Vérifié par KatiMarket » reste, mais devient facultatif.

## État de la production (lu le 7 novembre)

- Hors NowTech, 7 produits, tous actifs (OGA SHOP). 6 d'entre eux n'ont pas de prix.
- En attente :
  - 1 révision de contenu (NowTech, HP OMEN 16) ;
  - 1 photo proposée ;
  - aucun produit ni offre en validation.
- Aucun vendeur sous surveillance.

## Étapes

1. **Backend** (BackendKati, TDD) :
   - **Règle commune** `publicationDirecte(vendeur)` : vrai si le vendeur est actif, faux s'il est sous surveillance.
   - **Fiche et prix :** `creerProduitComplet`, `proposerProduit` et `creerOffre` publient directement quand la règle l'autorise : produit `actif`, offre `publiee` et révision `approuvee` par le système. Sinon, le parcours actuel s'applique.
   - **Révisions :** les révisions d'offre (`soumettreRevision`), de contenu et de photos du vendeur s'appliquent tout de suite sous la même règle.
   - **Prévenir l'équipe :** une notification « Nouveau produit en ligne : X (boutique) » ou « Produit modifié », et une entrée au journal `marketplace.produit.publie_direct`.
   - **Nouveaux endpoints équipe** (`exigerSuivi` : direction ou point focal) :
     - `POST moderation/produits/:id/masquer` (motif obligatoire) : le produit et ses offres passent en `suspendu`/`suspendue` ;
     - `POST moderation/produits/:id/retablir` ;
     - `POST moderation/produits/:id/correction` (motif) : le produit reste en ligne et le vendeur est notifié ;
     - `POST moderation/produits/:id/supprimer` (motif, direction seulement) : statut `archive`. Il n'y a pas d'effacement physique, à cause de l'historique des commandes ;
     - `PATCH moderation/produits/:id` : l'équipe modifie le nom, les descriptions, la catégorie et la fiche technique.
   - **Vendeur :** il ne peut pas rétablir un produit masqué. Le produit apparaît « Masqué par KatiMarket » avec le motif.
   - **Liste `moderation/produits-a-controler` :** les publications et modifications récentes, non encore vues, avec une action « Marquer comme vu ».
   - **Script `scripts/publication-directe-reprise.mjs`** (audit, puis `--apply`) :
     - il publie ce qui attend une validation (révisions de contenu ou d'offre ouvertes, photos proposées, produits soumis ou en vérification) des boutiques actives ;
     - il notifie chaque boutique qui a des produits actifs sans offre publiée.
2. **Panel** (adminkati, TDD) :
   - « Produits à contrôler » remplace la file de validation : la liste, les filtres boutique et date, et l'action « Vu » ;
   - sur chaque produit : Modifier, Masquer, Rétablir, Demander une correction et Supprimer. Chaque action demande une confirmation et un motif, sauf Modifier ;
   - la validation reste disponible pour les vendeurs sous surveillance.
3. **Site** (websitekati) :
   - les messages « envoyé à la modération » deviennent « Produit en ligne » ;
   - la liste des produits signale « Sans prix : ajoutez un prix » et le champ pour le saisir est intégré à la ligne ;
   - l'onglet **Offres** est retiré de la navigation vendeur ;
   - la zone photos affiche : « Format carré conseillé : 1 000 × 1 000 px (800 px minimum) · produit centré sur fond blanc ou clair · JPEG, PNG ou WebP, 5 Mo max. » ;
   - chaque photo choisie est mesurée. Un avertissement apparaît sous 800 px de côté ou au-delà d'un rapport de 1,5, sans bloquer l'envoi ;
   - un produit masqué apparaît dans l'espace vendeur avec le motif.
4. **Tests :**
   - Jest pour le backend ;
   - Vitest pour le panel ;
   - e2e pour le site : produit publié tout de suite, « Ajouter un prix », photo trop petite, vendeur sous surveillance toujours en validation.
5. **Mise en ligne** :
   - pousser les trois dépôts sur demande et redéployer ;
   - lancer le script de reprise, d'abord en audit, puis avec `--apply` sur accord.

## Hors périmètre

- Les règles automatiques de mots interdits ou de prix anormaux. On pourra les ajouter plus tard.
