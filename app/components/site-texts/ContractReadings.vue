<script setup lang="ts">
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { useContractReadings } from "@/composables/useSiteTexts"

// After an important change of the seller contract, which shops have read it. Nothing is blocked.
const { t, locale } = useI18n()
const readings = useContractReadings(true)
const read = computed(() => readings.data.value?.boutiques.filter(shop => shop.luLe).length ?? 0)
const formatDate = (iso: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(new Date(iso))
const status = (shop: { luLe: string | null; par: "acceptation" | "lecture" | null }) =>
  shop.luLe
    ? t(shop.par === "acceptation" ? "content.siteTexts.readings.acceptedOn" : "content.siteTexts.readings.readOn", {
        date: formatDate(shop.luLe),
      })
    : t("content.siteTexts.readings.notRead")
</script>

<template>
  <section class="rounded-md border border-border p-3" data-testid="site-text-contract-readings">
    <h4 class="text-sm font-semibold">{{ t("content.siteTexts.readings.title") }}</h4>
    <div v-if="readings.isPending.value" class="mt-2 h-10 animate-pulse rounded bg-muted" />
    <p v-else-if="!readings.data.value?.version" class="mt-1 text-sm text-muted-foreground">
      {{ t("content.siteTexts.readings.none") }}
    </p>
    <template v-else>
      <p class="mt-1 text-sm text-muted-foreground">
        {{
          t("content.siteTexts.readings.count", {
            number: readings.data.value.version.numero,
            read,
            total: readings.data.value.boutiques.length,
          })
        }}
      </p>
      <ul class="mt-2 max-h-64 divide-y divide-border overflow-y-auto text-sm">
        <li
          v-for="shop in readings.data.value.boutiques"
          :key="shop.id"
          class="flex items-center justify-between gap-2 py-1.5"
        >
          <span>{{ shop.nom }}</span>
          <Badge :variant="shop.luLe ? 'outline' : 'destructive'">{{ status(shop) }}</Badge>
        </li>
      </ul>
    </template>
  </section>
</template>
