<script setup lang="ts">
const { tm, rt } = useI18n({ useScope: "local" })
function groupLabel(key: string) {
  return rt((tm("groups") as Record<string, string>)[key] ?? key)
}
function linkLabel(key: string) {
  return rt((tm("links") as Record<string, string>)[key] ?? key)
}
const groups = [
  {
    id: "content",
    links: [
      { id: "banners", to: "/content" },
      { id: "texts", to: "/site-texts" },
      { id: "notifications", to: "/operations?tab=outbound-notifications" },
    ],
  },
  {
    id: "sales",
    links: [
      { id: "fees", to: "/operations?tab=delivery-fees" },
      { id: "cities", to: "/operations?tab=localities" },
      { id: "points", to: "/content?tab=points-de-vente" },
    ],
  },
  {
    id: "finance",
    links: [
      { id: "payments", to: "/operations?tab=payment-gateway" },
      { id: "kati", to: "/operations?tab=kati-points" },
      { id: "plans", to: "/operations?tab=installment-plans" },
    ],
  },
  {
    id: "governance",
    links: [
      { id: "team", to: "/team" },
      { id: "legal", to: "/operations?tab=legal-closure" },
      { id: "pilot", to: "/operations?tab=marketplace-pilot" },
    ],
  },
] as const
</script>
<template>
  <div class="grid gap-4 lg:grid-cols-2" data-testid="admin-settings-modules">
    <section v-for="group in groups" :key="group.id" class="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 class="font-heading text-lg font-semibold">{{ groupLabel(group.id) }}</h2>
      <ul class="mt-3 divide-y divide-border">
        <li v-for="link in group.links" :key="link.id">
          <NuxtLinkLocale
            :to="link.to"
            class="flex items-center justify-between gap-3 py-3 text-sm font-medium hover:text-primary"
            ><span>{{ linkLabel(link.id) }}</span
            ><Icon name="ph:arrow-right" aria-hidden="true"
          /></NuxtLinkLocale>
        </li>
      </ul>
    </section>
  </div>
</template>
<i18n lang="json">
{
  "en": {
    "groups": {
      "content": "Content and communication",
      "sales": "Delivery and locations",
      "finance": "Payments and commercial rules",
      "governance": "Team and governance"
    },
    "links": {
      "banners": "Banners and announcements",
      "texts": "Storefront text and contact information",
      "notifications": "Notification delivery",
      "fees": "Delivery rates",
      "cities": "Cities and neighbourhoods",
      "points": "Points of sale",
      "payments": "Payment gateway and reconciliation",
      "kati": "KATI policies",
      "plans": "Installment settings",
      "team": "Team and access roles",
      "legal": "Legal documents and closure",
      "pilot": "Deployment pilot and readiness"
    }
  },
  "fr": {
    "groups": {
      "content": "Contenus et communication",
      "sales": "Livraison et implantations",
      "finance": "Paiements et règles commerciales",
      "governance": "Équipe et gouvernance"
    },
    "links": {
      "banners": "Bannières et annonces",
      "texts": "Textes et coordonnées de la vitrine",
      "notifications": "Acheminement des notifications",
      "fees": "Tarifs de livraison",
      "cities": "Villes et quartiers",
      "points": "Points de vente",
      "payments": "Passerelle de paiement et rapprochements",
      "kati": "Politiques KATI",
      "plans": "Paramètres de l’échelonnement",
      "team": "Équipe et rôles d’accès",
      "legal": "Documents juridiques et clôture",
      "pilot": "Pilote de déploiement et préparation"
    }
  }
}
</i18n>
