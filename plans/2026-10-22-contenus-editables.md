# Contenus éditables depuis le panel (pages légales, À propos, FAQ, e-mails)

Statut : validé et réalisé le 22 octobre 2026 (lots 1 à 7) ; compte rendu dans `walkthroughs/2026-10-22-contenus-editables.md`.

## Le besoin

La direction et son équipe modifient elles-mêmes, sans développeur ni déploiement :

- les pages légales (confidentialité, contrat vendeurs, CGV…) ;
- la page « À propos » ;
- la FAQ ;
- les textes des e-mails envoyés aux clients et aux boutiques.

Chaque texte existe en français et en anglais.

## Décisions prises (22 octobre 2026)

| Sujet | Décision |
|---|---|
| Qui fait quoi | L'équipe rédige, la direction publie. Les rédacteurs sont des membres dont le **rôle existant** y est autorisé (pas de nouveau rôle). |
| Contrat changé | On **avertit** les boutiques ; elles ne sont pas bloquées. |
| Entrée en vigueur programmée | Non : un texte s'applique dès sa publication. |
| Langues | Français et anglais pour chaque contenu, mais **l'anglais n'est pas obligatoire** pour publier. |
| Périmètre | Pages légales, « À propos », FAQ, textes des e-mails. |
| Ordre des e-mails | D'abord ceux des clients, puis ceux des boutiques et de l'équipe. |

## Ce qui existe aujourd'hui

- **Pages légales** : 8 pages écrites en dur dans `websitekati/src/components/marketplace/legal-content.ts`. Ce sont les mentions légales, la confidentialité, les cookies, les conditions d'utilisation, les CGV, le contrat vendeurs, la livraison et les retours, la sécurité. Elles sont en français seulement, et plusieurs passages portent encore « à compléter ».
- **À propos** : page écrite en dur (`websitekati/src/app/a-propos/page.tsx`).
- **FAQ** : pas de page publique. Trois réponses officielles (`faq.livraison`, `faq.garantie`, `faq.paiement`) vivent déjà dans la base de connaissances de l'assistant, modifiable depuis le panel. La page de commande les lit.
- **E-mails** : une cinquantaine de modèles écrits dans le code, répartis dans une dizaine de services (commandes, marketplace, paiement en plusieurs fois, vendeurs, équipe, vérification d'e-mail…). Ils partagent une forme commune : sujet, salutation, paragraphes, lien, signature.
- **Acceptations** : rien n'enregistre quelle version des CGV ou du contrat vendeur a été acceptée.
- **Panel** : une page « Contenu » existe déjà (bannières, annonces). Les nouveaux écrans s'y rangent.

## Principes

1. **Jamais écraser, toujours versionner.** Chaque publication crée une version numérotée (contenu FR et EN, rédacteur, publieur, date). Les anciennes versions restent consultables. On sait toujours quel texte s'appliquait à une date donnée.
2. **Brouillon → soumis → publié.**
   - Un membre de l'équipe rédige et soumet.
   - La direction relit l'aperçu, puis publie ou renvoie avec un commentaire.
   - La direction peut aussi rédiger et publier elle-même.
   - Tout est inscrit au journal.
3. **Contenu structuré, pas de HTML libre.**
   - Pages : sections (titre, paragraphes, puces), avec gras et liens internes autorisés.
   - E-mails : sujet, paragraphes et libellé du bouton.
   - On écarte ainsi le code injecté et les mises en page cassées ; le rendu reste identique sur mobile.
4. **L'anglais suit, sans bloquer.** Le français est obligatoire ; l'anglais ne l'est pas, pour qu'une correction urgente parte tout de suite.
   - Si la version publiée n'a pas d'anglais, le site anglais affiche le texte français avec la mention « English version coming soon ». Il ne garde pas une ancienne traduction devenue fausse : pour un texte juridique, mieux vaut le bon texte en français qu'un ancien texte en anglais.
   - Le panel signale **« Anglais à mettre à jour »** sur toute version dont le français a changé sans que l'anglais suive. La direction voit la liste de ce qui reste à traduire.
5. **Jamais de page vide.** Si le serveur ne répond pas, la vitrine affiche la dernière version connue, ou le texte actuel du code. Un e-mail sans texte personnalisé valide part avec le texte du code.

## 1. Pages légales et « À propos »

**Données**

- `contenus` : une ligne par page (clé, type « légal » ou « éditorial », version publiée en cours).
- `versions_contenu` :
  - numéro, statut (brouillon, soumis, publié, archivé) ;
  - titre, accroche et sections, en FR et en EN ;
  - nature du changement (mineur ou important) et résumé des changements ;
  - rédigé par, publié par, dates ;
  - commentaire de renvoi.
- La version 1 de chaque page reprend le texte actuel du code. La traduction anglaise initiale est proposée par nous, puis relue par vous.

**Panel** (Contenu → « Pages »)

- Liste des pages avec leur version en ligne et les brouillons en cours.
- Éditeur par sections, FR et EN côte à côte.
- Aperçu exact de la page.
- Comparaison avec la version en ligne : ce qui est ajouté ou retiré, section par section.
- Historique complet, avec la possibilité de repartir d'une ancienne version pour en faire un nouveau brouillon.
- Boutons « Soumettre » (équipe), « Publier » et « Renvoyer avec commentaire » (direction).

**Vitrine**

- Les pages lisent la version publiée dans la langue du visiteur.
- Le cache est vidé à la publication, par le même mécanisme d'étiquettes que les conditions de livraison.
- Mention « Version 4 — en vigueur depuis le … » et lien « Versions précédentes » pour les pages légales.

## 2. Acceptations et avertissements

- **Contrat vendeurs** :
  - l'acceptation est enregistrée à l'inscription : boutique, membre, version et date ;
  - un **changement important** déclenche un e-mail aux propriétaires et gérants de toutes les boutiques, plus un bandeau dans l'espace vendeur : « Le contrat vendeur a changé — lire les changements » ;
  - le bouton « J'ai pris connaissance » est enregistré, mais **rien n'est bloqué** ;
  - la direction voit qui a lu et qui n'a pas lu.
- **CGV** : la version en vigueur est enregistrée sur chaque commande et chaque paiement en plusieurs fois. En cas de litige, on sait laquelle s'appliquait.
- **Changement mineur** (faute, adresse) : ni e-mail ni bandeau.

## 3. FAQ

On repart de la base de connaissances existante, pour garder **une seule source** : la même réponse sert la FAQ publique, l'assistant et la page de commande.

- Les fiches « réponse officielle » gagnent :
  - une case « visible dans la FAQ » ;
  - une rubrique (Commandes, Livraison, Paiement, Paiement en plusieurs fois, Retours, Compte, Vendeurs) ;
  - un ordre ;
  - le texte anglais.
- Nouvelle page publique `/faq` (FR/EN), avec recherche et une ancre par question.
- L'édition passe par le même circuit brouillon → publié et garde un historique.

## 4. Textes des e-mails

- **Un catalogue des e-mails**, construit à partir du code, donne pour chacun :
  - une clé (par ex. `echelonnement.versement`) ;
  - qui le reçoit et quand il part ;
  - **les variables autorisées** (`{reference}`, `{montant}`, `{echeance}`, `{produit}`…) ;
  - le texte par défaut du code.
- **Le panel** (Contenu → « E-mails ») permet de remplacer, en FR et en EN, le sujet, les paragraphes et le libellé du bouton.
  - La salutation, la signature et le lien restent automatiques.
  - L'aperçu se fait avec des données d'exemple.
  - Un bouton « Revenir au texte d'origine » remet le texte du code.
- **Garde-fous** :
  - une variable inconnue est refusée à l'enregistrement ;
  - une variable essentielle oubliée (la référence d'un paiement, par exemple) est signalée ;
  - un texte personnalisé illisible au moment de l'envoi n'empêche jamais l'e-mail de partir : c'est le texte du code qui part.
- **Langue d'envoi** : celle choisie par le client sur le site (FR ou EN), à enregistrer sur son profil. Le français reste la langue par défaut quand rien n'est connu.
- **Anglais absent** : un client anglophone reçoit le texte anglais d'origine du code. Le panel signale « Anglais à mettre à jour » quand le français a été personnalisé sans l'anglais.
- **Ordre de migration** : on rend d'abord éditables les e-mails clients les plus vus (commande, paiement, livraison, paiement en plusieurs fois), puis les autres par famille. Chaque famille reste fonctionnelle avec ses textes du code tant qu'elle n'est pas migrée.

## Rôles

Les rôles d'équipe existants sont : direction, comptoir, préparation, livreur. On n'en crée pas de nouveau.

- **Rédiger** : la direction, plus les rôles qu'elle autorise.
  - Un réglage du panel (Contenu → « Qui peut rédiger ») permet de cocher les rôles autorisés. Par défaut : **comptoir**.
  - Le choix se change sans développeur. Un membre d'un rôle non coché ne voit pas ces écrans.
- **Publier** : la direction seule.

## Découpage en lots

1. **Fondations** :
   - tables des contenus et versions, réglage des rôles autorisés à rédiger, API (brouillon, soumission, publication, renvoi, historique, « anglais à mettre à jour »), journal ;
   - chargement des 8 pages légales et de « À propos » en version 1 (FR + traduction EN proposée).
2. **Panel des pages** : liste, éditeur FR/EN, aperçu, comparaison, historique, circuit de validation.
3. **Vitrine** : pages légales et « À propos » lues depuis l'API (cache vidé à la publication), mention de version, archives, secours en cas de panne.
4. **Acceptations** : contrat vendeur à l'inscription, version des CGV sur les commandes et plans, e-mail et bandeau en cas de changement important, suivi des lectures.
5. **FAQ** : champs ajoutés aux fiches, éditeur, page `/faq` FR/EN.
6. **E-mails** : catalogue et variables, éditeur avec aperçu, langue du client, migration par famille (clients d'abord).
7. **Fin** : tests automatiques, recette en navigateur, comptes rendus et commits locaux.

Les lots 1 à 3 suffisent pour que l'équipe modifie les pages. Le lot 4 apporte la sécurité juridique, les lots 5 et 6 le reste du périmètre.

## Points d'attention

- **Juridique** : les textes « à compléter » (RCCM, NIU, siège, hébergeur) et la traduction anglaise des pages légales doivent être validés par le juriste. L'outil le permet, il ne le remplace pas.
- **Référencement** : URLs inchangées. Les pages anglaises gardent leur propre titre et description.
- **E-mails** : un texte trop long ou trompeur reste possible. Le circuit de validation par la direction est le garde-fou.

## Réponses du 22 octobre 2026

1. **Rédaction** : des rôles existants autorisés par la direction (réglage du panel, comptoir par défaut), pas de nouveau rôle.
2. **Langues** : l'anglais n'est pas obligatoire pour publier. Sans anglais à jour, le site anglais affiche le français avec une mention, et le panel liste ce qui reste à traduire.
3. **E-mails** : d'abord ceux des clients, puis ceux des boutiques et de l'équipe.
