# Validation finale administrative

1. Lire et tester les routes réelles publiques et les refus anonymes de `https://api.katimarket.com`, en lecture seule, sans tokens inventés ni envoi de notifications. Vérifier les contrats retournés sans consigner de données personnelles. L’utilisateur ne fournit pas d’accès authentifiés : ne pas bloquer les autres travaux ; marquer cette limite explicitement.
2. Exécuter les tests métier frontend/backend des modules administratifs et gardes selon rôle, les scénarios de sauvegarde/édition, et les tests de reprise existants. Vérifier syntaxe des scripts Bash avec Git Bash si disponible et outils Docker locaux en lecture seule ; ne restaurer que dans environnement isolé disponible, jamais sur la base réelle.
3. Faire une recette navigateur locale desktop et mobile avec API contractuelle de test, et des vérifications publiques avec API réelle ; garder distincts les deux résultats. Corriger débordements, erreurs, pages vides, hydratation et permissions détectés dans le périmètre.
4. Exécuter format, i18n, lint, typecheck, fallow et compilations. Écrire walkthrough avec résultats réellement observés, écarts et limites de certification production.

Terminé quand les corrections locales et contrôles disponibles passent et que chaque contrôle non réalisable est précisément signalé. La validation authentifiée en production et la preuve de restauration du serveur restent non confirmées sans accès ; ne pas les annoncer réussies. Aucun commit ni déploiement demandé.
