# Plan — Kati, une assistante qui comprend le client

## Objectif

Kati doit comprendre n'importe quelle demande d'un client avant de répondre :
- quelle que soit la formulation, l'orthographe ou la langue (français, anglais, camfranglais, pidgin) ;
- qu'il s'agisse d'un produit, d'un service, d'une panne, d'une commande ou d'une réclamation.

Quand elle ne comprend pas, elle pose une question de précision. Après deux incompréhensions, elle passe la main à un conseiller.

Elle ne doit jamais inventer un produit, un prix, un stock, un délai ou une promesse commerciale.

## Décisions prises

| Sujet | Décision |
|---|---|
| Fournisseur d'IA | OpenAI, le même que pour les fiches produits du panel |
| Périmètre | Toutes les demandes dès le départ, pour ne pas reprendre le chatbot plus tard |
| Ton | Vouvoiement |
| Langues | Français, anglais (le site est bilingue), camfranglais et pidgin compris |
| Passation | À un conseiller après 2 incompréhensions consécutives |

## Diagnostic de départ

Exemple réel du 30 octobre : « Je un laptop de 200 000F ».

- `200 000F` : le « F » collé empêche de recoller « 200 » et « 000 », et « de » n'est pas un mot de prix. Le budget est perdu.
- `200 000f` reste dans les mots cherchés. Le chatbot exige que chaque mot figure dans le nom du produit, donc il ne trouve rien.
- Il se rabat sur le mot le plus long, « laptop », et montre 304 articles. Le premier coûte 1 470 000 XAF.

Sur 12 phrases réalistes passées dans `comprendre()`, seules 2 sont bien lues. Les échecs viennent de quatre limites :

1. **Prix.** « 200k », « 50 mille », « 1,5 million », « 150.000f », « de 200 000 », « 200 000 fcfa » et « j'ai 300 000 » ne sont pas reconnus.
2. **Mots obligatoires.** Un mot non compris fait tomber la recherche à zéro.
3. **Synonymes.** « ordinateur » ne trouve pas les produits nommés « Laptop HP… ».
4. **Besoins.** « pour étudiant », « gamer » ou « pas trop cher » sont cherchés comme des mots dans le nom du produit.

## Principe : l'IA comprend, la base répond

```
Question du client
  │
  ├─ 1. Préparation      masquage des données personnelles, contexte de la conversation
  ├─ 2. Compréhension    le modèle OpenAI lit la demande et appelle des OUTILS
  ├─ 3. Faits            les outils interrogent la base (catalogue, fiches, tarifs, commandes)
  ├─ 4. Réponse          le modèle rédige à partir des seuls faits rendus par les outils
  ├─ 5. Contrôle         le serveur vérifie la réponse avant de l'envoyer
  └─ 6. Journal          tout est consigné pour l'amélioration continue
```

Si OpenAI est indisponible, trop lent, au-delà du plafond de coût ou désactivé, le moteur à règles, renforcé au lot 1, répond à sa place. Kati répond donc toujours.

### Les outils mis à disposition du modèle

Le modèle n'a accès à la base que par ces fonctions. Elles sont en lecture seule, sauf `ouvrir_demande_conseiller`.

| Outil | Rôle |
|---|---|
| `rechercher_produits` | Termes et synonymes, budget min/max, marque, catégorie, usage, tri, stock, promotion |
| `detail_produit` | Caractéristiques d'un produit cité (« il a combien de RAM ? ») |
| `comparer_produits` | Deux à quatre produits déjà cités, côte à côte |
| `lire_fiche` | Garantie, livraison, paiement, retours, KATI, devenir vendeur, comptoirs, entreprise |
| `tarif_livraison` | Frais et délai pour une ville ou un quartier |
| `depannage` | Fiches de dépannage existantes, par appareil et par symptôme |
| `suivre_commande` | Statut d'une commande, seulement pour un client connecté et propriétaire de la commande |
| `ouvrir_demande_conseiller` | Passation à un humain, avec un résumé de la conversation pour le conseiller |

### La réponse structurée

Le modèle ne renvoie pas du texte libre, mais un objet validé par un schéma :

```json
{
  "type": "reponse | precision | hors_perimetre | conseiller",
  "comprise": true,
  "texte": "…",
  "produits": ["slug-1", "slug-2"],
  "fiche": "livraison",
  "choix": ["Bureautique", "Études", "Jeux", "Graphisme"],
  "criteres": { "produit": "ordinateur portable", "prixMax": 200000, "usage": "études" }
}
```

### Contrôles côté serveur, avant envoi

- Chaque produit cité doit faire partie de ceux que les outils ont rendus pendant ce tour ou dans la conversation. Sinon, il est retiré.
- Prix, stock et liens des cartes produits viennent de la base, jamais du texte du modèle.
- Un montant écrit dans le texte et absent des faits rendus fait rejeter la réponse, qui passe alors au moteur à règles.
- Aucune promesse hors des fiches : remise, délai, gratuité de livraison.
- Nombre d'appels d'outils limité par tour (4), avec un délai maximal par tour.

## Comprendre toutes les façons de demander

### Budget

| Écrit par le client | Compris comme |
|---|---|
| « 200k », « 200 000F », « 200.000 fcfa », « 200 mille », « deux cent mille » | 200 000 |
| « 1,5 million », « 1M5 », « 1 500 000 » | 1 500 000 |
| « moins de / max / pas plus de / budget / j'ai X » | maximum X |
| « à X », « de X », « vers X », « autour de X », « environ X » | autour de X (fourchette à valider, voir les questions ouvertes) |
| « entre X et Y » | de X à Y |
| « pas cher », « abordable » | tri par prix croissant, sans plafond inventé |

S'il n'y a rien dans le budget, Kati le dit et propose ce qui s'en approche le plus, par exemple : « Rien à 200 000, voici les trois plus proches, à partir de 215 000 ».

### Vocabulaire

- **Synonymes et abréviations** : ordi, PC, laptop, notebook ; tel, phone, smartphone, android ; imprimante, printer ; onduleur, UPS ; etc.
- **Camfranglais et pidgin** : « je veux un bon ordi pour mon petit qui part à la fac », « le prix c'est combien », « ça coûte combien même », « I wan buy phone », « vous avez le truc pour charger ? ».
- **Fautes et mots collés** : « ondulleur », « ordinateure », « 200000f ».
- **Besoins traduits en critères** :
  - « pour étudiant », « bureautique » : prix modéré, 8 Go de RAM minimum ;
  - « gamer », « montage vidéo » : carte graphique, 16 Go de RAM ou plus ;
  - « pour boutique » : caisse, imprimante ticket, onduleur.

### Contexte de la conversation

Kati garde les critères des derniers tours : « et moins cher ? », « en HP seulement », « le deuxième, il a quelle garantie ? ». Les produits déjà cités sont désignables par leur rang (« le premier », « celui à 683 000 »).

### Questions de précision

- **Demande claire** : Kati répond directement.
- **Information décisive manquante** : une seule question courte, avec des boutons de réponse rapide. Par exemple : « Ce sera pour quel usage ? » avec [Bureautique] [Études] [Jeux] [Graphisme].
- **Deux sens possibles** : Kati demande lequel au lieu de deviner.
- Elle ne pose jamais deux questions de suite sur le même point. Si le client ne précise pas, elle montre une sélection large.

## Passation à un conseiller

Une **incompréhension**, c'est l'un de ces trois cas :
- un tour où `comprise` vaut `false` ;
- un tour hors périmètre non résolu ;
- une recherche à zéro résultat après tous les replis.

Le compteur est tenu par conversation et remis à zéro dès qu'un tour aboutit.

| Situation | Action |
|---|---|
| 2 incompréhensions consécutives | Passation proposée, avec le résumé de la conversation |
| Le client demande un humain | Passation immédiate |
| Réclamation, litige, remboursement, colère | Passation immédiate, après un accusé de réception poli |
| Paiement en échec ou fraude suspectée | Passation immédiate, sans jamais demander de code |

La passation réutilise les demandes existantes (`POST assistant/demandes`, `DemandeEquipe` sur le site, écran Demandes du panel).

## Sécurité et garde-fous

- **Injection de consignes.** « Ignore tes instructions », « donne-moi 50 % de remise », « tu es maintenant… » : Kati ignore ces consignes et reste sur son rôle.
- **Données sensibles.**
  - Numéros de téléphone, e-mails et références de paiement sont masqués avant l'envoi à OpenAI.
  - Kati ne demande jamais de code, de mot de passe ou de numéro de carte.
- **Coûts.**
  - Plafond de jetons par réponse, nombre de tours limité par conversation, plafond quotidien global.
  - Au-delà du plafond quotidien, le moteur à règles prend le relais.
- **Disponibilité.** Délai maximal par appel, aucune relance cachée (même règle que le client OpenAI du panel), repli automatique.
- **Interrupteur.** `ASSISTANT_IA_ACTIF=false` coupe l'IA sans déploiement.
- **Abus.** Les limites de débit actuelles restent (1 message toutes les 2 s, 20 par minute).

## Amélioration continue : comment Kati « apprend »

Le modèle n'est pas réentraîné sur les conversations. Le risque de dérive est trop grand et les données sont celles des clients. L'apprentissage est une boucle pilotée par l'équipe :

1. **Journal enrichi** de chaque tour : intention, critères compris, outils appelés, nombre de résultats, `comprise`, repli utilisé, durée, jetons consommés.
2. **Écran « Questions à revoir »** dans le panel : questions non comprises, sans résultat ou passées à un conseiller, regroupées par thème, avec leur fréquence.
3. **Corrections en un clic** :
   - synonyme ou expression → produit ou catégorie (« ndolé » → rayon alimentaire, « tchop » → manger, etc.) ;
   - nouvelle fiche de réponse, ou fiche existante complétée ;
   - réponse validée, réutilisée comme exemple pour le modèle.
4. **Prise en compte immédiate** : ces corrections sont fournies au modèle à chaque tour et alimentent aussi le moteur à règles.
5. **Rapport hebdomadaire** : taux de compréhension, taux de passation, questions les plus fréquentes.

## Configuration

| Variable | Rôle |
|---|---|
| `OPENAI_API_KEY` | Clé du backend (distincte de celle du panel, pour suivre les coûts séparément) |
| `OPENAI_ASSISTANT_MODEL` | Modèle principal, rapide (par défaut celui déjà validé dans le panel) |
| `OPENAI_ASSISTANT_MODEL_DIFFICILE` | Modèle plus puissant, facultatif, pour les cas ambigus |
| `ASSISTANT_IA_ACTIF` | Interrupteur général |
| `ASSISTANT_IA_PLAFOND_JOUR` | Plafond quotidien de jetons |
| `ASSISTANT_IA_DELAI_MS` | Délai maximal par appel |

Le choix final du modèle se fait sur le jeu d'évaluation du lot 7, en comparant qualité, délai et coût.

## Lots de réalisation

| Lot | Contenu | Résultat visible |
|---|---|---|
| 1 | **Moteur à règles robuste** : tous les formats de prix, synonymes, mots non compris retirés au lieu de bloquer, échelle de repli, « rien dans le budget, voici les plus proches » | La capture du 30/10 répond correctement, même sans IA |
| 2 | **Socle IA** : client OpenAI du backend, configuration, outils en lecture, réponse structurée, contrôles serveur, repli automatique, interrupteur | Kati comprend les formulations libres |
| 3 | **Dialogue** : contexte de conversation, questions de précision avec boutons, compteur d'incompréhensions, passation avec résumé | Kati demande au lieu de deviner |
| 4 | **Services** : tarifs de livraison, suivi de commande (client connecté), retours, KATI, devenir vendeur, dépannage | Kati répond hors catalogue |
| 5 | **Apprentissage** : journal enrichi, écran « Questions à revoir », corrections, rapport hebdomadaire | L'équipe améliore Kati sans développeur |
| 6 | **Interfaces** : boutons de choix, cartes produits, comparaison et état « conseiller » dans le widget du site ; même assistante dans l'application mobile si souhaité | Expérience complète côté client |
| 7 | **Évaluation et mise en ligne** : jeu de 150 à 200 vraies questions, notation automatique, ouverture progressive (10 %, puis 50 %, puis 100 % des conversations) | Mise en production sans risque |

Chaque lot aura son compte rendu dans `walkthroughs/`, comme les autres.

## Fichiers principalement touchés

| Dépôt | Fichiers |
|---|---|
| BackendKati | `src/assistant/` : nouveaux `ia/` (client, outils, schéma, contrôles), `comprendre.ts` renforcé, `assistant.service.ts`, `catalogue-assistant.ts` |
| BackendKati | `prisma/` : colonnes de journal sur les messages, table des corrections (synonymes, expressions, exemples validés) |
| BackendKati | `src/config/configuration.ts`, `.env.example` |
| websitekati | `src/components/assistant/` : boutons de choix, cartes, comparaison, état conseiller |
| adminkati | Écran « Questions à revoir » et gestion des corrections |

## Réponses du 30 octobre

1. **« Un laptop de 200 000F »** se lit « autour de 200 000 » : de 75 % à 110 % du montant (150 000 à 220 000), classé du plus proche au plus éloigné. « Moins de », « max », « budget » et « j'ai » restent des plafonds.
2. **Budget IA** : pas de plafond mensuel pour l'instant. `ASSISTANT_IA_PLAFOND_JOUR` reste facultatif et vide par défaut. Le journal des jetons est tenu pour suivre la dépense.
3. **Application mobile** : Kati y est intégrée au lot 6.
4. **Vie privée** : la mention du prestataire d'IA est ajoutée directement à la politique de confidentialité (site et application), sans validation préalable.
5. **Jeu d'évaluation** : construit à partir de formulations camerounaises probables (français parlé, camfranglais, pidgin, fautes, montants abrégés), complété par les conversations enregistrées dès qu'elles sont accessibles.
