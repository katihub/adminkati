<script setup lang="ts">
import type { AuditActorType, AuditCategory, AuditFilters } from "@/types/api/audit"
import { useTeamRoster } from "@/composables/useTeamRoster"
import { AUDIT_ACTOR_TYPES, AUDIT_CATEGORIES } from "@/utils/audit"

/** The audit filters (12 November 2026): period, family, author and object. */
const filters = defineModel<AuditFilters>({ required: true })
const { t } = useI18n({ useScope: "local" })
const { members } = useTeamRoster()

function set<K extends keyof AuditFilters>(key: K, value: AuditFilters[K] | "") {
  filters.value = { ...filters.value, [key]: value || undefined }
}

/* Explicit keys: the translation check reads every label. */
function categoryLabel(category: AuditCategory) {
  const labels: Record<AuditCategory, string> = {
    argent: t("category.money"),
    commandes: t("category.orders"),
    vendeurs: t("category.sellers"),
    catalogue: t("category.catalogue"),
    clients: t("category.customers"),
    administration: t("category.administration"),
  }
  return labels[category]
}

function actorLabel(type: AuditActorType) {
  const labels: Record<AuditActorType, string> = {
    equipe: t("actor.team"),
    vendeur: t("actor.seller"),
    client: t("actor.customer"),
    systeme: t("actor.system"),
    anonyme: t("actor.anonymous"),
  }
  return labels[type]
}

const field = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-testid="audit-filters">
    <label class="grid gap-1 text-xs text-muted-foreground"
      >{{ t("from") }}
      <input
        :class="field"
        type="date"
        :value="filters.du ?? ''"
        data-testid="audit-from"
        @change="set('du', ($event.target as HTMLInputElement).value)"
    /></label>
    <label class="grid gap-1 text-xs text-muted-foreground"
      >{{ t("to") }}
      <input
        :class="field"
        type="date"
        :value="filters.au ?? ''"
        data-testid="audit-to"
        @change="set('au', ($event.target as HTMLInputElement).value)"
    /></label>
    <label class="grid gap-1 text-xs text-muted-foreground"
      >{{ t("category.label") }}
      <select
        :class="field"
        :value="filters.categorie ?? ''"
        data-testid="audit-category"
        @change="set('categorie', ($event.target as HTMLSelectElement).value as AuditCategory)"
      >
        <option value="">{{ t("all") }}</option>
        <option v-for="category in AUDIT_CATEGORIES" :key="category" :value="category">
          {{ categoryLabel(category) }}
        </option>
      </select></label
    >
    <label class="grid gap-1 text-xs text-muted-foreground"
      >{{ t("actor.label") }}
      <select
        :class="field"
        :value="filters.acteurType ?? ''"
        data-testid="audit-actor-type"
        @change="set('acteurType', ($event.target as HTMLSelectElement).value as AuditActorType)"
      >
        <option value="">{{ t("all") }}</option>
        <option v-for="type in AUDIT_ACTOR_TYPES" :key="type" :value="type">{{ actorLabel(type) }}</option>
      </select></label
    >
    <label class="grid gap-1 text-xs text-muted-foreground"
      >{{ t("member") }}
      <select
        :class="field"
        :value="filters.acteurId ?? ''"
        data-testid="audit-member"
        @change="set('acteurId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ t("all") }}</option>
        <option v-for="member in members" :key="member.id" :value="member.id">{{ member.nom }}</option>
      </select></label
    >
    <label class="grid gap-1 text-xs text-muted-foreground"
      >{{ t("object") }}
      <input
        :class="field"
        :value="filters.cible ?? ''"
        :placeholder="t('objectHint')"
        data-testid="audit-object"
        @change="set('cible', ($event.target as HTMLInputElement).value)"
    /></label>
    <label class="grid gap-1 text-xs text-muted-foreground sm:col-span-2"
      >{{ t("action") }}
      <input
        :class="field"
        :value="filters.q ?? ''"
        :placeholder="t('actionHint')"
        data-testid="audit-action"
        @change="set('q', ($event.target as HTMLInputElement).value)"
    /></label>
  </div>
</template>

<i18n lang="json">
{
  "fr": {
    "from": "Du",
    "to": "Au",
    "all": "Tous",
    "member": "Membre de l’équipe",
    "object": "Identifiant d’un objet",
    "objectHint": "Commande, vendeur, document…",
    "action": "Action",
    "actionHint": "retrait, document.refuse, commande…",
    "category": {
      "label": "Famille",
      "money": "Argent",
      "orders": "Commandes",
      "sellers": "Vendeurs",
      "catalogue": "Catalogue",
      "customers": "Clients",
      "administration": "Administration"
    },
    "actor": {
      "label": "Auteur",
      "team": "Équipe",
      "seller": "Vendeur",
      "customer": "Client",
      "system": "Système",
      "anonymous": "Anonyme"
    }
  },
  "en": {
    "from": "From",
    "to": "To",
    "all": "All",
    "member": "Team member",
    "object": "Object identifier",
    "objectHint": "Order, seller, document…",
    "action": "Action",
    "actionHint": "retrait, document.refuse, commande…",
    "category": {
      "label": "Family",
      "money": "Money",
      "orders": "Orders",
      "sellers": "Sellers",
      "catalogue": "Catalogue",
      "customers": "Customers",
      "administration": "Administration"
    },
    "actor": {
      "label": "Author",
      "team": "Team",
      "seller": "Seller",
      "customer": "Customer",
      "system": "System",
      "anonymous": "Anonymous"
    }
  }
}
</i18n>
