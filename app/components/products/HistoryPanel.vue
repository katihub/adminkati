<script setup lang="ts">
import type { ProductHistoryEntry } from "@/types/api/produits"
import { computed } from "vue"

const { historique } = defineProps<{ historique: ProductHistoryEntry[] }>()

const { t } = useI18n()

/**
 * `detectee_le` is the one timestamp every entry always carries (`decidee_le` is null
 * until a decision is made), so it's the defensive sort key — the API is documented to
 * already return entries newest-first, but nothing here should trust that silently.
 */
const sortedEntries = computed(() => [...historique].sort((a, b) => b.detectee_le.localeCompare(a.detectee_le)))
</script>

<template>
  <section data-testid="products-history-panel" class="rounded-2xl bg-card p-5 sm:p-6">
    <h2 class="text-base font-medium text-foreground">
      {{ t("products.historyPanel.title") }}
    </h2>

    <p
      v-if="sortedEntries.length === 0"
      data-testid="products-history-panel-empty"
      class="mt-4 text-sm text-muted-foreground"
    >
      {{ t("products.historyPanel.empty") }}
    </p>

    <ol v-else class="mt-6">
      <ProductsHistoryEntry v-for="entry in sortedEntries" :key="entry.id" :entry="entry" />
    </ol>
  </section>
</template>
