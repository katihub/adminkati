# Compte rendu — Kati, lots 2 à 7 : l'IA, le dialogue, les services, l'apprentissage, les écrans et l'évaluation

Plan : `plans/2026-10-30-assistant-kati-ia.md`. Lot 1 : `walkthroughs/2026-10-30-assistant-kati-lot-1.md`.

## En bref

- **Le modèle OpenAI comprend la demande.** Il ne lit la base que par des outils.
- **Le serveur vérifie chaque réponse avant de l'envoyer.**
- **Le moteur à règles reprend la main** si l'IA est coupée, lente, en erreur ou rejetée. Kati répond donc toujours.
- **Kati pose une question quand il le faut.** Après deux incompréhensions, ou tout de suite en cas de réclamation, de paiement en échec ou de demande d'un humain, elle passe la main avec un résumé.
- **L'équipe corrige Kati depuis le panel**, onglet Opérations > Kati, sans développeur.
- **Kati est dans l'application mobile.** La politique de confidentialité du site et de l'application mentionne OpenAI.

## Essai réel avec la clé OpenAI

Cinq questions envoyées au vrai modèle (`gpt-5.6-luna`), sur un faux catalogue :

| Question | Ce que Kati a fait | Durée |
|---|---|---|
| « Je un laptop de 200 000F » | Cherche `laptop`, prix visé 200 000. Montre le HP 15 à 199 000, puis 215 000 et 245 000 | 8,4 s |
| « mola je cherche un bon ordi pour mon petit qui part à la fac, budget 250k » | Cherche un ordinateur portable pour étudiant, 250 000 maximum | 6,0 s |
| « I wan buy phone for 50k abeg » | Répond en anglais, téléphones autour de 50 000 | 7,0 s |
| « vous livrez à Bonamoussadi ? ça coûte combien » | Appelle le tarif de livraison pour Douala, Bonamoussadi | 4,2 s |
| « je veux un truc » | Question de précision : [Un téléphone] [Un ordinateur] [Électroménager] [Autre] | 3,1 s |

Coût observé : **environ 4 200 jetons en entrée et 250 en sortie par question**, presque tout dans les consignes.

L'essai a fait corriger trois défauts :
- « de 200 000 » était lu comme un plafond ;
- le modèle cochait « en stock » et « moins cher » sans qu'on le demande ;
- « 250k » écrit par le client n'était pas reconnu comme un montant permis.

## Ce qui a été fait

### Lot 2 — le socle IA (`BackendKati/src/assistant/ia/`)

- `client-openai.ts` : API Responses, par `fetch`, sans SDK.
  - Rien n'est stocké chez OpenAI (`store: false`).
  - Aucune relance cachée ; délai maximal par appel.
- `outils.ts` : huit outils, la seule porte du modèle vers la base.
  - `rechercher_produits`, `detail_produit`, `comparer_produits` ;
  - `lire_fiche`, `tarif_livraison`, `depannage` ;
  - `suivre_commande` (client connecté seulement) ;
  - `ouvrir_demande_conseiller`.
  - Au plus quatre appels par tour.
- `consignes.ts` : le rôle, le vouvoiement, le camfranglais et le pidgin, les montants, les règles de passation, et ce que Kati ne fait jamais.
  - La réponse est un objet validé par schéma.
- `controles.ts` : vérifié avant envoi.
  - Retiré : un produit qu'aucun outil n'a rendu.
  - Réponse rejetée : un montant qu'aucun outil ni le client n'a écrit.
  - Réponse rejetée : une gratuité ou une remise absente des fiches.
  - Réponse rejetée : toute demande de code ou de mot de passe.
- `masquage.ts` : téléphones, e-mails et références de paiement retirés avant l'envoi et dans le journal.
- `kati-ia.service.ts` : la boucle d'appels.
  - Interrupteur, part des conversations ouverte à l'IA, plafond quotidien facultatif.
  - Second avis par un modèle plus puissant si `OPENAI_ASSISTANT_MODEL_DIFFICILE` est renseigné.

### Lot 3 — le dialogue (`assistant.service.ts`, `dialogue.ts`)

- **Contexte** : les huit derniers tours sont relus, avec les produits montrés numérotés. « le deuxième » et « celui à 215 000 » se comprennent.
- **Question de précision sur le budget** : quand la sélection dépasse 12 articles, Kati montre les produits et propose des boutons [Moins de 100 000] [De 100 000 à 250 000]… Elle ne repose pas la question si le client l'ignore.
- **Incompréhensions** : la première demande de reformuler, avec des exemples. La seconde de suite passe la main.
- **Passation immédiate** :
  - le client demande un humain ;
  - réclamation, colis non reçu ou arrivé cassé, remboursement, colère ;
  - paiement en échec, argent débité, arnaque. Dans ce cas, Kati rappelle de ne jamais donner son code secret.
- **Le résumé de la passation** pré-remplit la question du formulaire (site et application).

### Lot 4 — les services

- Suivi de commande : les trois dernières commandes du client connecté, avec leur statut en mots. Un visiteur anonyme est invité à se connecter, et aucune commande n'est lue.
- Frais de livraison : par ville et quartier, d'après les tarifs du panel.
- Fiches retours, KATI et devenir vendeur : retrouvées par leur titre si elles ont été écrites depuis le panel.
- Détail produit : caractéristiques, garantie, état et délai, par la même lecture que la page produit.

### Lot 5 — l'apprentissage

- **Base** : migration `20261030120000_journal_kati`.
  - `tours_assistant` : un tour par ligne (moteur, repli, compris, passation, outils appelés, durée, jetons).
  - `corrections_assistant` : ce que l'équipe apprend à Kati.
- **API** (direction et comptoir) :
  - `GET assistant/administration/kati/a-revoir` et `POST …/a-revoir/revus` ;
  - `GET` et `POST …/kati/corrections`, `POST …/corrections/:id/retrait` ;
  - `GET …/kati/rapport`.
- **Panel, Opérations > Kati** :
  - le rapport des 7 derniers jours (questions, taux de compréhension, de passation, part de l'IA, jetons) ;
  - les questions à revoir, regroupées par fréquence ;
  - « Apprendre un synonyme », « Valider une réponse », « Marquer comme vue ».
- **Une correction vaut dès la question suivante.** Les synonymes réécrivent la question avant le moteur à règles, et les deux sortes de corrections sont données au modèle.

### Lot 6 — les interfaces

- **Site** :
  - le formulaire « Poser ma question à l'équipe » reprend le résumé ;
  - « Je filtre sur » affiche la marque, « autour de 200 000 XAF » et « les moins chers d'abord » ;
  - une ligne sous le champ signale l'IA, avec le lien vers la confidentialité.
- **Politique de confidentialité du site** : nouvelle section « Kati, l'assistante, et l'intelligence artificielle ». Elle dit ce qui part chez OpenAI et ce qui n'y part pas, les 30 jours de conservation possibles chez OpenAI pour la sécurité, et le traitement hors du Cameroun.
- **Application mobile** :
  - nouvel écran `/kati`, avec cartes produits, suites en boutons, formulaire conseiller et fil gardé sur l'appareil ;
  - entrées depuis l'accueil, le compte et l'assistance ;
  - section IA dans l'écran Confidentialité.
  - **Non commitée**, comme le reste de mobilekati, selon ta consigne.

### Lot 7 — l'évaluation et la mise en ligne

- `src/assistant/evaluation/questions-kati.json` : 152 formulations probables (français parlé, camfranglais, pidgin, fautes, montants abrégés), avec la réponse attendue.
- **Moteur à règles**, noté à chaque `jest`, sans pouvoir redescendre :

  | Genre | Compris |
  |---|---|
  | Produits | 95/97 |
  | Fiches | 21/21 |
  | Dépannage | 7/8 |
  | Passation | 14/14 |
  | Commandes | 4/4 |
  | Accueil | 2/2 |

  Questions encore ratées :
  - « ondulleur apc pas cher » : la faute n'est corrigée qu'au moment de la recherche, donc la réponse reste juste ;
  - « montre connectée » : « montre » est lu comme le verbe ;
  - « l'écran de mon laptop est noir ».
- **`scripts/evaluer-kati.mjs --api <url>`** note une vraie API, IA comprise. À lancer avant chaque palier.

## Vérification

- Backend : 228 tests du chatbot passent, dont 41 nouveaux.
  - Socle IA avec un faux client : boucle d'outils, plafond de 4 appels, rejet d'un prix inventé, de gratuités et de demandes de code, masquage, second avis, part stable par conversation.
  - Dialogue : 11 passations, 4 non-passations, suivi de commande, lieux, synonymes.
  - Évaluation sur les 152 formulations.
- Vérification de types sans erreur.
- Panel : 76 tests sur l'écran Kati et la page Opérations ; vue-tsc sans erreur ; hooks de commit passés.
- Site : `tsc` et eslint sans erreur.
- Mobile : `tsc` et eslint sans erreur. Écran `/kati` vérifié en captures, avec des réponses simulées.
- **Non vérifié** : le parcours complet contre une base réelle, faute de base locale. Il n'a pas été joué contre la production non plus, pour ne pas y écrire.

## Mise en ligne (à faire)

1. **Coolify, service backend** :
   - `OPENAI_API_KEY` (la même valeur que dans `BackendKati/.env`) ;
   - `ASSISTANT_IA_PART=10` pour commencer ;
   - les autres variables gardent leur valeur par défaut. `ASSISTANT_IA_PLAFOND_JOUR` reste vide.
2. **Déployer.** La migration `20261030120000_journal_kati` s'applique au démarrage (`migrate deploy`). Elle ne fait que créer deux tables.
3. **Lancer** `node scripts/evaluer-kati.mjs --api https://api.katimarket.com --sortie eval.json`. Les tours du script apparaissent dans l'écran Kati : les marquer comme vus.
4. **Suivre l'écran Kati** quelques jours, puis passer `ASSISTANT_IA_PART` à 50, puis à 100.
5. **Couper l'IA sans redéployer** : `ASSISTANT_IA_ACTIF=false`.

## Commits

| Dépôt | Commit | Contenu |
|---|---|---|
| BackendKati | `1b6dd21` | Lots 2 à 5 |
| BackendKati | `794bbdb` | Lot 7 |
| adminkati | `bdffb2e` | Écran Kati (lot 5) |
| adminkati | ce commit | Ce compte rendu, et l'état du plan |
| websitekati | `be7a165` | Widget et confidentialité (lot 6) |
| mobilekati | — | Écran Kati, non commité |
