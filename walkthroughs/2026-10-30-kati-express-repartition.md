# Compte rendu — Kati Express : répartition et espace livreur

Plan : `plans/2026-10-30-kati-express-repartition.md`.

## Panel : Opérations > Kati Express (direction)

- **Trois files avec leurs compteurs** :
  - **À attribuer** : sans livreur, ou à réattribuer après un échec ou un report ;
  - **En cours** ;
  - **Terminées**.
  - Un filtre par ville. La liste s'actualise toutes les minutes.
- **Chaque livraison en carte** : référence, quartier et ville, boutique, nombre d'articles, montant à encaisser (ou « Déjà payée »), colis prêt ou en préparation, livreur actuel.
- **En cliquant sur une livraison** :
  - le détail : où récupérer, repère, téléphone du client, montant, commande ;
  - les **livreurs proposés**, classés, avec leurs raisons (« Déjà 1 livraison dans ce quartier », « 2 missions en cours », « Marge d'espèces après : 330 000 FCFA ») ;
  - le premier livreur attribuable est marqué **Recommandé** ;
  - un livreur que le plafond bloquerait est affiché avec la raison, mais sans bouton.
- **« Attribuer à … »** : l'équipe valide. La route existante refait tous ses contrôles. La livraison passe en cours et apparaît dans l'application du livreur.
- **Colonne Livreurs** : chaque livreur Kati Express actif avec ses missions, l'argent qu'il porte, ce qu'il n'a pas remis à la caisse et son plafond.

## Application mobile : Compte > Kati Express > Espace livreur

L'entrée n'apparaît que si le serveur confirme le rôle livreur.

- **Mes missions** :
  - en tête : nombre de missions à faire, total à encaisser, livraisons du jour ;
  - onglets « À faire », « En attente », « Terminées » ;
  - chaque carte indique la prochaine étape (« Récupérer chez NowTech Center », « Partir livrer », « Remettre au client ») ;
  - on actualise en tirant vers le bas.
- **Une mission** :
  - en haut, les étapes (Attribuée, Récupérée, En route, Livrée) ;
  - un cadre orange avec **la seule action à faire maintenant** :
    - **Récupérer** : photo du colis, ou référence de l'étiquette (vérifiée à l'écran) ;
    - **Je pars livrer** ;
    - **Remettre** : envoyer le code au client (valable 30 minutes), saisir le code qu'il donne et le montant encaissé (un écart est signalé) ;
    - **Un problème** : reporter, échec ou refus du client, avec un motif et une confirmation.
  - dessous :
    - Récupérer chez : boutique, adresse, colis prêt ou non ;
    - Livrer à : quartier, repère, bouton « Appeler le client » ;
    - Encaissement ;
    - Contenu du colis ;
    - Historique.

## Vérification

- **Backend** : 6 nouveaux tests, et les 41 tests des livraisons passent. Ils couvrent :
  - le classement par quartier puis par charge ;
  - le blocage par plafond, avec la raison ;
  - le plafond de la ville, et l'absence de plafond ;
  - le tableau et ses compteurs, limité à Kati Express ;
  - les livreurs vérifiés seulement, avec les espèces non remises ;
  - une mission ouverte à son livreur seulement, sans le code.
  - Vérification de types sans erreur.
- **Panel** :
  - un test de bout en bout de l'écran : file, livreurs, suggestions, livreur bloqué sans bouton, attribution envoyée seulement après le clic ;
  - le test de la page Opérations mis à jour ;
  - vue-tsc et contrôles de traduction sans erreur.
- **Application** :
  - `tsc` et eslint sans erreur ;
  - écrans « mission à récupérer » et « mission en livraison » vérifiés en captures, avec des réponses simulées.
- **Non vérifié** :
  - le parcours réel de bout en bout (base, livreur connecté, envoi du code par courriel) ;
  - l'écran « Mes missions » connecté, car la clé Supabase manque dans l'application.

## À savoir pour la mise en service

- **Un livreur Kati Express** est un membre de l'équipe avec le rôle `livreur`. Sa fiche d'agent est créée par la direction (`POST marketplace/expeditions/agents-katihub`). Elle est vérifiée d'office.
- **Plafond d'espèces** : sans plafond, ni pour le livreur ni pour sa ville, toute livraison avec de l'argent à encaisser reste bloquée. L'écran le dit.
- **Code client** : il part par courriel (`SECRET_CODES_LIVRAISON` et l'envoi de courriels doivent être configurés). Un client sans courriel ne peut pas recevoir de code.
- **L'application mobile n'est pas commitée**, comme le reste de mobilekati.
