## What I built

Fiche vendeur enrichie : identité légale, commission, statut et KYC ; pour chaque boutique, toutes les villes, livraison, retrait, gestionnaire SAV, point focal, membres et nombre d’offres. Accès au catalogue filtré et aux finances pour la direction, aperçu qualité et sanctions, pagination des vendeurs.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Identité et KYC | Done | `SellerOnboardingWorkspace.vue`, décisions et justificatifs existants conservés |
| Boutiques, villes et SAV | Done | `SellerShops/SellerShops.vue`, types marketplace moderation |
| Agents et qualité | Done | `ShopMembers/ShopMembers.vue`, `SellerQuality/SellerQuality.vue` |
| Catalogue et finance filtrés | Done | Liens avec boutiqueId ; `MarketplaceOffersWorkspace.vue` lit le filtre URL |
| Droits | Done | Menu KYC exclu du comptoir ; lectures boutiques limitées au périmètre du point focal |

## Deviations

Le dernier snapshot de réputation et les 10 dernières sanctions sont inclus dans la lecture vendeur existante plutôt qu’une requête qualité supplémentaire. Le détail complet reste dans Qualité et sanctions. La lecture existante renvoyait toutes les boutiques d’un vendeur suivi par un point focal : ajout d’un filtre relationnel dans liste et fiche, avec régression observée rouge puis verte. Le choix SAV enregistré est affiché, pas changé automatiquement.

## Tests

Backend : 8 suites ciblées, 50 tests passants. Frontend : dernier run combiné, 10 fichiers et 121 tests passants. Les cas nouveaux vérifient villes dédupliquées, SAV Kati Service, membres, taux de litiges et liens réservés ; le backend vérifie le filtre des boutiques assignées. Typecheck, lint, i18n et audit fallow réussis ; avertissements préexistants non bloquants conservés.

Playwright en remplacement du Browser plugin absent, sur 127.0.0.1:4280 avec API de recette contractuelle : vendeur → finance via le lien boutique ; pages desktop/mobile non vides, sans overlay ni débordement, dernier passage sans erreur console. Captures temporaires `katihub-domain-seller-desktop.png` et `katihub-domain-seller-mobile.png`. Style marine/orange et composants existants préservés.

## Not done

Pas de nouvelle politique KYC, de modification d’inscription vendeur, de mutation automatique du SAV, de commit ou de déploiement. Les états qualité restent ceux réellement fournis par le backend.

## Notes for the reviewer

Le compteur produits compte les offres de boutique. Les snapshots et sanctions sont des résumés bornés ; la fiche qualité existante donne la suite. Le point focal n’obtient ni lien finance ni lien vers le module qualité réservé aux autres rôles.
