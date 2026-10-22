# Walkthrough — Contenus éditables (pages légales, À propos, FAQ, e-mails)

Plan : `plans/2026-10-22-contenus-editables.md`. Les lots 1 à 7 sont réalisés.

## Résultat

**Panel — Marketing → « Textes du site »** (lien depuis la page Contenu, route `/textes-du-site`)

- **Qui peut rédiger** : la direction coche les rôles autorisés (comptoir par défaut). Elle rédige et publie toujours ; un membre d'un rôle non coché voit « Rédaction non autorisée ».
- **Liste des textes** : 8 pages légales, « À propos », la FAQ et 44 e-mails. Chaque texte affiche :
  - sa version en ligne ;
  - le brouillon en cours, avec son état (brouillon, soumis à la direction) ;
  - le signal « Anglais à mettre à jour », s'il y a lieu.
- **Éditeur** :
  - français et anglais, l'anglais facultatif ;
  - pages par sections ; la structure d'« À propos » est verrouillée ;
  - FAQ par rubriques et questions ;
  - e-mails : sujet, paragraphes et bouton, avec leurs variables affichées ;
  - aperçu, et liste des changements par rapport à la version en ligne ;
  - nature du changement (mineur ou important) et résumé ;
  - case « l'anglais a été relu ».
- **Circuit** :
  - enregistrer, puis soumettre à la direction ;
  - la direction publie, ou renvoie le texte avec un commentaire obligatoire ;
  - historique des versions, et possibilité de repartir d'une ancienne version.
- **Contrat vendeur** : la direction voit quelles boutiques ont lu le dernier changement important.

**Vitrine**

- **Pages légales** :
  - version publiée, dans la langue choisie ;
  - sans anglais à jour, le texte français s'affiche avec « English version coming soon » ;
  - mention « Version N, en vigueur depuis le … », liste des versions et lecture d'une version archivée (`/<page>/versions/<n>`) ;
  - le texte du code reste le secours si l'API ne répond pas.
- **« À propos »** : les textes viennent du panel ; les chiffres et les catégories restent automatiques.
- **`/faq`** : rubriques, recherche, une ancre par question, FR/EN. Un lien est ajouté dans le pied de page.
- **Espace vendeur** : un bandeau « Le contrat vendeur a changé » s'affiche jusqu'à « J'ai pris connaissance ».
- **Langue des e-mails** : la langue choisie sur le site est transmise au compte du client.

**Backend**

- **Migrations**, toutes avec retour arrière :
  - `20261022220000_contenus_editables` : tables, et textes de départ des 9 pages (version 1 en français ; traduction anglaise proposée, soumise à la direction) ;
  - `20261022230000_acceptations_contenus` : acceptations du contrat (les boutiques existantes en version 1), version des CGV sur les commandes et les plans ;
  - `20261022233000_faq_editable` : FAQ reprise de la base de connaissances ;
  - `20261022234000_langue_client`.
- **Format** : texte structuré, sans HTML. Seuls `**gras**` et les liens sûrs sont reconnus (page du site, https, mailto) ; un lien `javascript:` est refusé.
- **Publication** : la version publiée prend le numéro suivant, la précédente est archivée. La vitrine est revalidée sur la seule étiquette `contenu:<clé>`.
- **Contrat vendeur** :
  - acceptation enregistrée à l'inscription ;
  - un changement important envoie un e-mail aux propriétaires et gérants ;
  - « J'ai pris connaissance » est enregistré.
- **FAQ** : la publication met à jour les fiches de connaissance reliées, en origine `panel` pour que le chargeur ne les écrase plus. L'assistant et la page de commande disent ainsi la même chose.
- **E-mails** : 44 modèles (32 clients, 11 boutiques, 1 équipe), avec leurs variables et leur texte d'origine FR/EN.
  - Un paragraphe dont une variable est vide n'est pas envoyé.
  - Un texte publié impossible à remplir laisse partir le texte d'origine.
  - Les dates sont écrites dans la langue du client.

## Vérifications

- **Backend** : tests des formats, du circuit, du contrat vendeur, de la FAQ et des modèles d'e-mails. Les 44 modèles d'origine passent la vérification du panel. Suite des modules concernés : 520 tests au vert ; 4 échecs déjà présents, dus aux notifications push d'un autre développeur (`appareilPush` absent des mocks). Avec ce mock ajouté, les tests de notifications passent sur les nouveaux textes.
- **Recettes sur le backend local et la vitrine de dev** :
  - publication de la traduction anglaise des CGV, visible tout de suite grâce à la revalidation ;
  - bascule FR/EN ;
  - modification du seul français : anglais « à mettre à jour », mention sur le site anglais ;
  - gras et liens rendus ;
  - versions archivées ;
  - « À propos » dans les deux langues ;
  - FAQ : recherche, publication, fiche `faq.livraison` mise à jour ;
  - e-mail d'ouverture d'un plan reçu en anglais puis en français selon la langue du client, avec le texte publié.
- **Panel** : 8 tests du nouvel écran et 6 tests unitaires ; oxlint, i18n:check, typecheck et fallow au vert. Recette en navigateur sur le panel de dev (connexion direction, réglages, liste, éditeur, aperçu, changements, e-mails), sans erreur JavaScript.
- **Vitrine** : tests de bout en bout pour les pages légales (secours et mention anglaise) et le bandeau du contrat vendeur.

## Écarts au plan

- **FAQ** : elle est éditée comme un contenu à part entière (versions, circuit, FR/EN). Elle met à jour les fiches de connaissance qu'elle reprend, plutôt que de se construire à partir d'elles. Une seule source reste ainsi modifiable : la FAQ.
- **Fiches non reprises** dans la FAQ de départ : `faq.offre`, `faq.etat-produit`, `faq.installation`, `faq.localisation`, qui décrivent encore l'ancien magasin NowTech. L'assistant les garde inchangées.
- **Langue du client** : elle est stockée sur `clients.langue`, pas sur le profil, qui n'existe pas toujours.
- **E-mails anciens non repris** : ceux des anciennes commandes NowTech (`src/commandes/notifications.service.ts`), de la vérification d'e-mail et de l'équipe (invitations) gardent leur texte du code.

## Limites

- Les boutiques et l'équipe reçoivent leurs e-mails en français : leur langue n'est pas encore connue.
- La traduction anglaise des pages légales est une proposition, à faire relire et valider par le juriste avant publication.
- Pas d'accès direct dans la barre latérale pour un rédacteur de rôle « préparation » ou « livreur » : il passe par le lien de la page Contenu ou par l'adresse de la page.
