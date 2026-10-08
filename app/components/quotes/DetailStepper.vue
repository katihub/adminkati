<script setup lang="ts">
import type { DevisDetail } from "@/types/api/devis"
import { computed } from "vue"

const { quote } = defineProps<{
  quote: DevisDetail
}>()

const { t } = useI18n()

const isArchived = computed(() => quote.statut === "archive")
const isConverted = computed(() => quote.statut === "commande")
</script>

<template>
  <div
    v-if="!isArchived"
    class="hidden sm:flex items-center justify-between pt-2.5 text-xs font-medium overflow-x-auto"
    role="progressbar"
    :aria-valuenow="isConverted ? 2 : 1"
    aria-valuemin="1"
    :aria-valuemax="2"
  >
    <div
      class="flex items-center gap-1.5 shrink-0"
      :class="
        isConverted
          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
          : 'rounded-lg bg-primary/10 px-2.5 py-1 font-bold text-foreground'
      "
    >
      <Icon
        :name="isConverted ? 'ph:check-circle-fill' : 'ph:file-text'"
        size="14"
        aria-hidden="true"
        :class="!isConverted ? 'text-primary animate-pulse' : ''"
      />
      <span>{{ t("quotes.status.ouvert") }}</span>
    </div>

    <div
      class="h-0.5 min-w-4 flex-1 mx-2 rounded-full transition-colors"
      :class="isConverted ? 'bg-emerald-500/40' : 'bg-muted-foreground/15'"
    />

    <div
      class="flex items-center gap-1.5 shrink-0"
      :class="
        isConverted
          ? 'rounded-lg bg-primary/10 px-2.5 py-1 font-bold text-foreground'
          : 'text-muted-foreground/50 opacity-60'
      "
    >
      <Icon :name="isConverted ? 'ph:shopping-cart-fill' : 'ph:circle'" size="14" aria-hidden="true" />
      <span>{{ t("quotes.status.commande") }}</span>
    </div>
  </div>

  <div
    v-else
    class="flex items-center gap-2 w-max rounded-xl bg-muted/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
  >
    <Icon name="ph:archive-tray" size="14" aria-hidden="true" class="shrink-0" />
    <span>{{ t("quotes.status.archive") }}</span>
  </div>
</template>
