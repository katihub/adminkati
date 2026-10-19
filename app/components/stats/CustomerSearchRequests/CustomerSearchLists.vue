<script setup lang="ts">
import type { CustomerSearchDashboard } from "@/types/api/customer-searches"
import { formatDateCourte } from "@/utils/dates"

const { popular, recent } = defineProps<{
  popular: CustomerSearchDashboard["populaires"]
  recent: CustomerSearchDashboard["recentes"]
}>()

const { locale, t } = useI18n({ useScope: "local" })
</script>

<template>
  <div class="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div data-testid="customer-search-popular">
      <h3 class="text-sm font-semibold">{{ t("popular") }}</h3>
      <ol class="mt-3 divide-y divide-border/60">
        <li v-for="item in popular" :key="item.requete" class="flex items-center gap-3 py-3">
          <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ item.requete }}</span>
          <span class="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {{ item.occurrences }}
          </span>
        </li>
      </ol>
    </div>

    <div data-testid="customer-search-recent">
      <h3 class="text-sm font-semibold">{{ t("recent") }}</h3>
      <ol class="mt-3 divide-y divide-border/60">
        <li v-for="item in recent" :key="item.id" class="py-3">
          <div class="flex items-start justify-between gap-3">
            <p class="min-w-0 truncate text-sm font-medium">{{ item.requete }}</p>
            <time class="shrink-0 text-xs text-muted-foreground" :datetime="item.creeLe">
              {{ formatDateCourte(item.creeLe, locale) }}
            </time>
          </div>
          <p v-if="item.rayon" class="mt-1 text-xs text-muted-foreground">{{ item.rayon }}</p>
        </li>
      </ol>
    </div>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "popular": "Most requested",
    "recent": "Latest wording"
  },
  "fr": {
    "popular": "Les plus demandées",
    "recent": "Dernières formulations"
  }
}
</i18n>
