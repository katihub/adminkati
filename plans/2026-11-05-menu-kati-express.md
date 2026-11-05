# Plan : entrée « Kati Express » dans le menu Logistique

## Besoin

L'écran Kati Express (répartition des livraisons et livreurs) n'est accessible que par les onglets de la page Opérations. Il faut une entrée directe dans le groupe **Logistique** du menu de gauche.

## Étapes

1. `app/utils/admin-navigation.ts` : entrée `kati-express`, placée en tête du groupe Logistique. Elle pointe vers `/operations?tab=kati-express`, avec l'icône `ph:moped`, et reste réservée à la direction, comme l'onglet.
2. Libellé `admin.navigation.items.katiExpress` en français et en anglais (`i18n/locales/common`).
3. Tests de navigation : ordre du groupe Logistique, et lien Kati Express qui active le groupe.
