# Walkthrough — Renommage visible KatiMarket

## Résultat

- La vitrine affiche désormais « KatiMarket » dans les titres SEO, l’en-tête, le pied de page, les parcours client/vendeur, les assistants et les messages de commande.
- Le tableau de bord admin utilise « KatiMarket Admin » et « KatiMarket AI » dans sa configuration et ses traductions FR/EN. Son mot-symbole et son favicon s’appuient sur un nouveau monogramme SVG KatiMarket, au lieu de l’ancien lockup KatiHub.
- Les sorties backend concernées (expéditeur, vérification de courriel, assistance, notifications, devis PDF et reçu de reversement) portent KatiMarket.
- Les clés `katihub`, le domaine `katihub.cm`, le mode de livraison « Kati Express » et les clés de stockage historiques sont préservés. Aucune raison sociale `Kati Hub SARL` n’était présente dans ces interfaces/sorties ; aucune n’a été inventée ni modifiée.

## Vérifications

- Vitrine : `npm.cmd run typecheck` — réussi ; `npm.cmd test` — 3/3 ; `npm.cmd run build` — réussi.
- Vitrine : `npm.cmd run lint` — échec sur `CentreAssistance.tsx:90`, règle `react-hooks/set-state-in-effect` dans le chargement existant, sans lien avec le changement de marque.
- Vitrine : E2E `e2e/branding.spec.ts` — échec au contrôle du titre, le serveur local renvoyant encore « KatiHub — vos boutiques locales au même endroit » malgré un build propre dont le HTML généré contient KatiMarket. Des serveurs de test préexistants écoutent sur 3311 et 3312 ; le parcours navigateur local reste à revalider dans un environnement isolé.
- Admin : vérificateurs i18n — réussis ; lint — réussi avec deux avertissements préexistants ; 3 fichiers de tests de marque/admin, 7 tests — réussis.
- Admin : `npm.cmd run typecheck` — échec sur `DeliveryFeesWorkspace.vue:297-298` et deux fixtures de `delivery-fees-workspace.test.ts` (propriétés/paramètres incompatibles), liées au travail préexistant de tarifs de livraison.
- Backend : 5 suites ciblées courriel, vérification, assistance et PDF — 41 tests réussis avant les nouvelles assertions ciblées ; les assertions backend marque courriel/vérification/PDF ont ensuite passé : 3 suites, 21 tests.

## Limites

- Les images de campagne téléversées peuvent encore inclure l’ancien nom dans leurs pixels ; elles sont éditoriales et gérées séparément depuis le tableau de bord.
- L’asset PNG historique reste dans les dossiers publics mais n’est plus utilisé par le mot-symbole ou le favicon actifs.
