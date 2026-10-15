<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { useKatiIndicators, useKatiMutations } from "@/composables/useKati"
import { useToastAction } from "@/composables/useToastAction"

const emit = defineEmits<{ open: [section: "sponsorships" | "policy"] }>()
const { t, locale } = useI18n()
const query = useKatiIndicators()
const { runJobs } = useKatiMutations()
const run = useToastAction()
const number = computed(() => new Intl.NumberFormat(locale.value))
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const pockets = computed(() => {
  const data = query.data.value
  if (!data) return []
  return [
    {
      key: "available",
      label: t("operations.kati.overview.available"),
      points: data.kati.disponible,
      value: data.valeurFcfa.disponible,
    },
    {
      key: "pending",
      label: t("operations.kati.overview.pending"),
      points: data.kati.enAttente,
      value: data.valeurFcfa.enAttente,
    },
    { key: "reserved", label: t("operations.kati.overview.reserved"), points: data.kati.reserve, value: null },
    { key: "used", label: t("operations.kati.overview.used"), points: data.kati.utilises, value: null },
    { key: "cancelled", label: t("operations.kati.overview.cancelled"), points: data.kati.annules, value: null },
    { key: "expired", label: t("operations.kati.overview.expired"), points: data.kati.expires, value: null },
  ]
})

function processNow() {
  void run(() => runJobs.mutateAsync(), t("operations.kati.overview.processed"))
}
</script>

<template>
  <div class="space-y-6" data-testid="kati-overview">
    <div v-if="query.isPending.value" class="grid gap-3 sm:grid-cols-3">
      <div v-for="n in 6" :key="n" class="h-24 animate-pulse rounded-lg bg-muted" />
    </div>
    <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <template v-else-if="query.data.value">
      <section>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm text-muted-foreground">
            {{
              t("operations.kati.overview.policy", {
                version: query.data.value.politiqueVersion,
                rate: query.data.value.katiParFcfa,
              })
            }}
          </p>
          <Button
            size="sm"
            variant="outline"
            :disabled="runJobs.isPending.value"
            data-testid="kati-run-jobs"
            @click="processNow"
            ><Icon name="ph:arrows-clockwise" /> {{ t("operations.kati.overview.runJobs") }}</Button
          >
        </div>
        <ul class="grid gap-3 sm:grid-cols-3">
          <li
            v-for="pocket in pockets"
            :key="pocket.key"
            class="rounded-lg border border-border bg-card p-4"
            :data-testid="`kati-pocket-${pocket.key}`"
          >
            <p class="text-xs text-muted-foreground">{{ pocket.label }}</p>
            <p class="mt-1 font-heading text-xl font-semibold">{{ number.format(pocket.points) }}</p>
            <p v-if="pocket.value !== null" class="text-xs text-muted-foreground">{{ money.format(pocket.value) }}</p>
          </li>
        </ul>
      </section>
      <section class="rounded-lg border border-border bg-card p-5" data-testid="kati-month">
        <h3 class="font-heading font-semibold">{{ t("operations.kati.overview.thisMonth") }}</h3>
        <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-muted-foreground">{{ t("operations.kati.overview.gains") }}</dt>
            <dd class="font-medium">{{ number.format(query.data.value.emisCeMois.gains) }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t("operations.kati.overview.commissions") }}</dt>
            <dd class="font-medium">{{ number.format(query.data.value.emisCeMois.commissions) }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t("operations.kati.overview.adjustments") }}</dt>
            <dd class="font-medium">{{ number.format(query.data.value.emisCeMois.ajustements) }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t("operations.kati.overview.cost") }}</dt>
            <dd class="font-semibold" data-testid="kati-month-cost">
              {{ money.format(query.data.value.emisCeMois.coutFcfa) }}
            </dd>
          </div>
        </dl>
      </section>
      <section class="flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm hover:border-primary"
          data-testid="kati-review-shortcut"
          @click="emit('open', 'sponsorships')"
        >
          <span class="block font-heading text-lg font-semibold">{{
            number.format(query.data.value.commissionsEnRevue)
          }}</span>
          {{ t("operations.kati.overview.underReview") }}
        </button>
        <div class="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <span class="block font-heading text-lg font-semibold">{{
            number.format(query.data.value.parrainagesActifs)
          }}</span>
          {{ t("operations.kati.overview.activeSponsorships") }}
        </div>
      </section>
    </template>
  </div>
</template>
