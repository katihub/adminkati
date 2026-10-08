<script setup lang="ts">
import type { ProductHistoryEntry, ProductHistoryType } from "@/types/api/produits"
import { computed } from "vue"
import { useHistoryValueFormatter } from "@/composables/useHistoryValueFormatter"
import { formatDateCourte } from "@/utils/dates"
import { imageValueUrl } from "@/utils/history-image-value"

const { entry } = defineProps<{ entry: ProductHistoryEntry }>()

const { locale, t, te } = useI18n()

const TYPE_STYLES: Record<
  ProductHistoryType,
  { dotClass: string; icon: string; markerClass: string; statusClass: string }
> = {
  creation: {
    icon: "ph:plus",
    markerClass: "border-success/20 bg-success/10 text-success",
    dotClass: "bg-success",
    statusClass: "bg-success/10 text-success",
  },
  modification: {
    icon: "ph:pencil-simple",
    markerClass: "border-info/20 bg-info/10 text-info",
    dotClass: "bg-info",
    statusClass: "bg-info/10 text-info",
  },
  disparition: {
    icon: "ph:trash",
    markerClass: "border-destructive/20 bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
    statusClass: "bg-destructive/10 text-destructive",
  },
}

/** History keys are column names; unknown ones (new backend fields) fall back to the raw key. */
function fieldLabel(field: string): string {
  const key = `products.historyEntry.fields.${field}`
  return te(key) ? t(key) : field
}

const formatValue = useHistoryValueFormatter()

/** A cleared field is still a change: only lines whose two sides read the same are dropped. */
const diffLines = computed(() =>
  Object.entries(entry.champs)
    .map(([field, change]) => ({
      field,
      before: formatValue(field, change?.avant),
      after: formatValue(field, change?.apres),
      beforeImage: imageValueUrl(field, change?.avant),
      afterImage: imageValueUrl(field, change?.apres),
    }))
    .filter(line => line.before !== line.after),
)
const typeStyle = computed(() => TYPE_STYLES[entry.type])
</script>

<template>
  <li
    v-if="diffLines.length"
    data-testid="products-history-panel-entry"
    :data-entry-id="entry.id"
    class="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-border/60 py-6 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-x-4 sm:py-8 before:absolute before:top-14 before:bottom-0 before:left-4 before:w-px before:bg-border last:before:hidden sm:before:left-5"
  >
    <span
      data-testid="products-history-panel-marker"
      class="z-10 flex size-8 shrink-0 justify-self-center items-center justify-center rounded-full bg-background! sm:size-10"
      :class="typeStyle.markerClass"
      aria-hidden="true"
    >
      <Icon :name="typeStyle.icon" size="17" aria-hidden="true" />
    </span>

    <div class="min-w-0">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 data-testid="products-history-panel-type" class="text-base font-semibold text-foreground sm:text-lg">
            {{ t(`products.historyEntry.title.${entry.type}`) }}
          </h3>
          <time
            v-if="entry.decidee_le"
            data-testid="products-history-panel-date"
            :datetime="entry.decidee_le"
            class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <Icon name="ph:calendar-dots" size="15" aria-hidden="true" />
            {{ formatDateCourte(entry.decidee_le, locale) }}
          </time>
        </div>

        <span
          data-testid="products-history-panel-status"
          class="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          :class="typeStyle.statusClass"
        >
          <span class="size-1.5 rounded-full" :class="typeStyle.dotClass" aria-hidden="true" />
          {{ t(`products.historyEntry.type.${entry.type}`) }}
        </span>
      </header>

      <ul class="mt-5 border-s border-border/70">
        <li
          v-for="line in diffLines"
          :key="line.field"
          data-testid="products-history-panel-diff"
          class="relative py-3 ps-5 first:pt-0 last:pb-0 before:absolute before:top-5 before:left-0 before:h-px before:w-3 before:bg-border first:before:top-2"
        >
          <p class="text-xs font-semibold text-muted-foreground">
            {{ fieldLabel(line.field) }}
          </p>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <NuxtImg
              v-if="line.beforeImage"
              provider="none"
              :src="line.beforeImage"
              :alt="fieldLabel(line.field)"
              loading="lazy"
              class="size-12 rounded-md border border-border bg-muted object-contain opacity-70"
            />
            <span v-else class="min-w-0 wrap-break-word text-muted-foreground">{{ line.before }}</span>
            <Icon name="ph:arrow-right" size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
            <NuxtImg
              v-if="line.afterImage"
              provider="none"
              :src="line.afterImage"
              :alt="fieldLabel(line.field)"
              loading="lazy"
              class="size-12 rounded-md border border-border bg-muted object-contain"
            />
            <span v-else class="min-w-0 wrap-break-word font-semibold text-foreground">{{ line.after }}</span>
          </div>
        </li>
      </ul>

      <div
        v-if="entry.decidee_par"
        data-testid="products-history-panel-decided-by"
        class="mt-5 flex flex-wrap items-center gap-2"
      >
        <span class="text-xs font-medium text-muted-foreground">{{ t("products.historyEntry.decidedByLabel") }}</span>
        <ProductsHistoryActorPill :actor="entry.decidee_par" />
      </div>
    </div>
  </li>
</template>
