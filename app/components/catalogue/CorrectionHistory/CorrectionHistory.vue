<script setup lang="ts">
import type { CatalogueHistoryEntry } from "@/types/api/catalogue-products"
import { formatDateCourte } from "@/utils/dates"
defineProps<{ entries: CatalogueHistoryEntry[] }>()
const { t, locale } = useI18n()
</script>
<template>
  <section class="flex flex-col gap-4">
    <h3 class="font-semibold">{{ t("catalogue.history") }}</h3>
    <p v-if="!entries.length" class="text-sm text-muted-foreground">{{ t("catalogue.noHistory") }}</p>
    <ol v-else class="flex flex-col gap-3">
      <li v-for="entry in entries" :key="entry.id" class="rounded-xl border border-border p-4">
        <p class="text-xs text-muted-foreground">
          {{ formatDateCourte(entry.creeLe, locale) }} · {{ entry.acteurRole }}
        </p>
        <p class="mt-2 text-sm font-medium">{{ entry.detail?.motif ?? entry.action }}</p>
        <details v-if="entry.detail?.avant && entry.detail?.apres" class="mt-2 text-xs text-muted-foreground">
          <summary class="cursor-pointer">{{ t("catalogue.info") }}</summary>
          <dl class="mt-2 flex flex-col gap-2">
            <div v-for="(value, key) in entry.detail.apres" :key="key" class="break-words">
              <dt class="font-medium">{{ key }}</dt>
              <dd class="whitespace-pre-wrap">
                {{ String(entry.detail.avant[key] ?? "—") }} → {{ String(value ?? "—") }}
              </dd>
            </div>
          </dl>
        </details>
      </li>
    </ol>
  </section>
</template>
