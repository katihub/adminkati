<script setup lang="ts">
import { computed, ref } from "vue"

/* THE KATI POINTS ADMINISTRATION. Four views of one programme: what it holds
   and costs, each client's balance and history, the sponsorships and the
   commissions under review, and the versioned policy that sets every rate. */
type Section = "overview" | "clients" | "sponsorships" | "policy"

const { t } = useI18n()
const SECTIONS: Section[] = ["overview", "clients", "sponsorships", "policy"]
const section = ref<Section>("overview")
const labels = computed<Record<Section, string>>(() => ({
  overview: t("operations.kati.sections.overview"),
  clients: t("operations.kati.sections.clients"),
  sponsorships: t("operations.kati.sections.sponsorships"),
  policy: t("operations.kati.sections.policy"),
}))
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="kati-workspace">
    <nav
      class="flex shrink-0 flex-wrap gap-1 border-t border-border bg-background px-4 py-2 sm:px-6 lg:px-10"
      :aria-label="t('operations.kati.sections.label')"
    >
      <button
        v-for="item in SECTIONS"
        :key="item"
        type="button"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="section === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'"
        :aria-pressed="section === item"
        :data-testid="`kati-section-${item}`"
        @click="section = item"
      >
        {{ labels[item] }}
      </button>
    </nav>
    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <OperationsKatiOverview v-if="section === 'overview'" @open="value => (section = value)" />
      <OperationsKatiClients v-else-if="section === 'clients'" />
      <OperationsKatiSponsorships v-else-if="section === 'sponsorships'" />
      <OperationsKatiPolicy v-else />
    </div>
  </div>
</template>
