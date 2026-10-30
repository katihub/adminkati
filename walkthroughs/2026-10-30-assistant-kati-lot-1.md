# Compte rendu — Kati, lot 1 : moteur à règles robuste

Plan : `plans/2026-10-30-assistant-kati-ia.md`. Code : `BackendKati/src/assistant/`.

## Le problème de départ

« Je un laptop de 200 000F » montrait 304 laptops, le premier à 1 470 000 XAF. Le budget était perdu, et le montant non compris (« 200 000f ») partait chercher un produit de ce nom.

## Ce qui change pour le client

| Le client écrit | Avant | Maintenant |
|---|---|---|
| « Je un laptop de 200 000F » | « laptop 200 000f », aucun budget | laptop, autour de 200 000 (150 000 à 220 000), du plus proche au plus éloigné |
| « ordinateur à 200k » | cherche « 200k » | ordinateur autour de 200 000 |
| « téléphone pas plus de 50 mille » | aucun budget | téléphone, 50 000 maximum |
| « pc gamer 1,5 million » | cherche « million » | pc gamer autour de 1 500 000 |
| « un frigo deux cent mille » | cherche « deux cent mille » | frigo autour de 200 000 |
| « pc portable de 100k à 200k » | aucun budget | laptop de 100 000 à 200 000 |
| « I wan buy phone for 50k » | cherche « wan buy phone for » | phone autour de 50 000 |
| « un bon pc pour étudiant pas trop cher » | cherche « bon pc etudiant trop » | pc, du moins cher au plus cher, « étudiant » retiré si rien ne le porte |
| « ordinateur » | seulement les produits nommés « Ordinateur… » | aussi les « Laptop », « Notebook », « ProBook »… |
| Rien dans le budget | « je ne trouve rien », renvoi vers un conseiller | « Je n'ai rien trouvé autour de 200 000 XAF pour « laptop ». Voici les plus proches de votre budget » |

## Ce qui a été fait

- **`montants.ts`** (nouveau) réécrit chaque montant en `<chiffres> fcfa` :
  - formats pris en charge : `200k`, `200 000F`, `200.000`, `50 mille`, `1,5 million`, `1M5`, `150000frs` ;
  - montants en toutes lettres (« deux cent cinquante mille »), seulement avec « mille » ou « million », pour que « un laptop » ne vaille pas 1 franc.
- **`comprendre.ts`, `lireBornes`** :
  - « à / de / pour / autour de / environ / dans les X » visent X, de 75 % à 110 % du montant (décision du 30 octobre) ;
  - « moins de / max / budget / j'ai / ne pas dépasser » plafonnent ;
  - « pas plus de » est désormais un plafond : il était lu comme un minimum ;
  - « de X à Y » est un intervalle ;
  - les années (« imprimante de 2019 »), les unités (VA, Go, mAh, m…) et les petits nombres sans monnaie ne sont pas des prix.
- **« pas cher », « abordable », « moins chers »** : tri par prix croissant, sans plafond inventé. « Les moins chers d'abord » resserre la question précédente au lieu de chercher « abord ».
- **Anglais, pidgin et interpellations** (« I wan », « abeg », « mola », « boss »…) : retirés des mots cherchés.
- **`synonymes.ts`** (nouveau) : 33 familles de produits (ordinateur, laptop, téléphone, kitman/écouteurs, frigo, clim, onduleur, groupe électrogène…).
  - « ordinateur portable » se lit comme un seul produit.
  - Les variantes courtes se comparent mot entier : « pc » ne trouve pas « PCIe ».
- **`catalogue-assistant.ts`** :
  - chaque mot du client accepte toutes les variantes de sa famille ;
  - classement par proximité du prix visé, ou par prix croissant ;
  - nouvelle méthode `essentiels()`, qui garde les familles et les mots du catalogue (marques, gammes) ;
  - le vocabulaire du catalogue garde désormais les mots de deux lettres (HP, LG).
- **`assistant.service.ts`**, nouvelle échelle de repli : recherche exacte → sans promotion → mots essentiels → hors budget, en montrant les plus proches et en le disant → mot porteur, de préférence une famille de produits. Le budget compris est affiché (« autour de 200 000 XAF ») et transmis au site (`prixCible`, `moinsCher`).

## Vérification

- Tests du chatbot : 184 passent (125 avant ce lot, 59 ajoutés), dont la phrase exacte de la capture du 30 octobre.
  - `montants.spec.ts` : 24 formats de montants.
  - `synonymes.spec.ts` : familles, camfranglais, pluriels, « pc » contre « PCIe ».
  - `comprendre.spec.ts` : 23 budgets écrits comme on parle.
  - `catalogue-assistant.spec.ts` : synonymes, tri par proximité et par prix.
  - `assistant.service.spec.ts` : capture du 30 octobre, repli hors budget, repli sur l'essentiel.
- La vérification de types passe sur tous les fichiers du chatbot. Le seul échec restant vient de `src/marketplace/produits-administration.service.spec.ts`, en cours d'écriture par une autre session.

## Limites connues, traitées aux lots suivants

- Les besoins (« pour étudiant », « gamer ») ne sont pas encore traduits en caractéristiques (RAM, carte graphique) : lot 2, avec l'IA.
- Pas encore de question de précision, ni de compteur d'incompréhensions : lot 3.
- Un nombre de 10 000 ou plus sans unité est lu comme un prix visé. Une référence de modèle de cinq chiffres serait mal lue : aucune n'a été trouvée dans le catalogue actuel.
