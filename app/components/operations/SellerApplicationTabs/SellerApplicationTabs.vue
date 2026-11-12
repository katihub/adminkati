<script setup lang="ts">
import type { SellerApplicationTab } from "@/types/api/marketplace-moderation"
import { SELLER_APPLICATION_TABS } from "@/utils/seller-applications"

/**
 * The tabs of the seller applications (12 November 2026): what the team has to do, what waits for the
 * seller, and the archives, each with its count for the current search.
 */
const { counts } = defineProps<{ counts?: Partial<Record<SellerApplicationTab, number>> }>()
const tab = defineModel<SellerApplicationTab>({ required: true })
const { t } = useI18n({ useScope: "local" })
</script>

<template>
  <nav class="-mb-px flex gap-1 overflow-x-auto" :aria-label="t('label')" data-testid="seller-application-tabs">
    <button
      v-for="item in SELLER_APPLICATION_TABS"
      :key="item"
      type="button"
      class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors"
      :class="
        tab === item
          ? 'border-primary font-semibold text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      "
      :aria-current="tab === item ? 'page' : undefined"
      :data-testid="`seller-application-tab-${item}`"
      @click="tab = item"
    >
      {{ t(item) }}
      <span
        v-if="counts?.[item] !== undefined"
        class="rounded-full px-1.5 text-[11px]"
        :class="tab === item ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
        >{{ counts[item] }}</span
      >
    </button>
  </nav>
</template>

<i18n lang="json">
{
  "en": {
    "label": "Application status",
    "a_traiter": "To review",
    "attente_vendeur": "Awaiting seller",
    "sans_piece": "No document",
    "valides": "Approved",
    "refuses": "Refused",
    "retires": "Withdrawn"
  },
  "fr": {
    "label": "État des candidatures",
    "a_traiter": "À traiter",
    "attente_vendeur": "Attente vendeur",
    "sans_piece": "Sans pièce",
    "valides": "Validés",
    "refuses": "Refusés",
    "retires": "Retirés"
  }
}
</i18n>
