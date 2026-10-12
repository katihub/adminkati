# Pièces justificatives privées des litiges

## Objectif

Permettre aux parties d'un litige de joindre et relire des preuves sans exposer les fichiers publiquement ni faire confiance au nom, à l'extension ou au MIME déclaré par le navigateur.

## Réutilisation et contrat

- Réutiliser `StockageService`, les messages de `DemandeClientMarketplace`, l'espace client de suivi et `MarketplaceDisputesWorkspace`.
- `POST /v1/marketplace/demandes-client/:id/messages/:messageId/pieces` accepte un multipart à champ unique `fichier`.
- `GET /v1/marketplace/demandes-client/:id/pieces/:pieceId` rend le fichier en téléchargement privé après autorisation et contrôle d'intégrité.
- Formats : PDF, JPEG, PNG, WebP; 10 Mio par fichier, 5 par message et 20 par dossier.

## Phases

1. Ajouter un bucket `litiges` privé et une contrainte d'unicité message/empreinte. Terminé quand la migration s'applique à la recette.
2. Valider signature binaire, MIME, taille, nom, auteur, état du dossier et quotas; stocker sous UUID et vérifier SHA-256 à la lecture. Terminé quand les tests de spoofing, métadonnées et accès interne passent.
3. Ajouter upload et téléchargement dans le suivi client, puis lister/télécharger les preuves dans le panel admin. Terminé quand les builds, typechecks, lints et contrôles i18n passent.

## États et risques

Les interfaces affichent vide, liste de pièces, upload en cours et erreur globale existante. Les fichiers ne sont jamais rendus inline; la réponse impose `attachment`, `private, no-store` et `nosniff`. Le principal risque restant est un fichier malveillant mais syntaxiquement valide; la restriction de formats et le téléchargement forcé réduisent l'exposition, sans prétendre remplacer un antivirus de contenu.
