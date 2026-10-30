<script setup lang="ts">
import type { CommandeDetail } from "@/types/api/commandes"
import { computed } from "vue"
import { formatDateCourte } from "@/utils/dates"

const { order } = defineProps<{
  order: Pick<CommandeDetail, "creeLe" | "livreurAffecteLe" | "recuLe" | "closeLe" | "motifCloture">
}>()
const { t, locale } = useI18n()
const events = computed(() =>
  [
    { id: "created", date: order.creeLe },
    { id: "courierAssigned", date: order.livreurAffecteLe },
    { id: "received", date: order.recuLe },
    { id: "closed", date: order.closeLe },
  ]
    .filter((event): event is { id: string; date: string } => Boolean(event.date))
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date)),
)
</script>

<template>
  <section class="rounded-2xl border border-border bg-card p-5" data-testid="orders-recorded-events">
    <h3 class="font-heading text-sm font-semibold">{{ t("orders.events.title") }}</h3>
    <p class="mt-1 text-xs text-muted-foreground">{{ t("orders.events.help") }}</p>
    <ol class="mt-4 flex flex-col gap-4 border-l border-border pl-4">
      <li v-for="event in events" :key="event.id" class="relative flex flex-col gap-1">
        <span class="absolute -left-5 top-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
        <span class="text-sm font-medium">{{ t(`orders.events.${event.id}`) }}</span>
        <time :datetime="event.date" class="text-xs tabular-nums text-muted-foreground">
          {{ formatDateCourte(event.date, locale) }}
        </time>
        <span v-if="event.id === 'closed' && order.motifCloture" class="text-xs text-muted-foreground">
          {{ t(`orders.closureMotives.${order.motifCloture}`) }}
        </span>
      </li>
    </ol>
  </section>
</template>
