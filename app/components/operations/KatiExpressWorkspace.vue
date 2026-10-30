<script setup lang="ts">
import type { KatiExpressQueue } from "@/composables/useKatiExpress"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useKatiExpressBoard } from "@/composables/useKatiExpress"

/**
 * KATI EXPRESS, THE MARKETPLACE'S DELIVERY SERVICE: who delivers what.
 *
 * The queue to assign comes first. Selecting a shipment shows its detail and the ranked
 * couriers; the team validates the suggestion with one click. Couriers and their load stay
 * in view, so a choice is never made blind.
 */
const { t } = useI18n()
const queue = ref<KatiExpressQueue>("a_attribuer")
const city = ref("")
const selectedId = ref<string | null>(null)
const board = useKatiExpressBoard(() => ({ file: queue.value, ville: city.value }))
const QUEUES: KatiExpressQueue[] = ["a_attribuer", "en_cours", "terminees"]
const selected = computed(() => board.data.value?.elements.find(shipment => shipment.id === selectedId.value) ?? null)
const tabs = computed(() =>
  QUEUES.map(value => ({
    value,
    label: `${t(`katiExpress.queues.${value}`)} (${board.data.value?.compteurs[value] ?? 0})`,
    testid: `kati-express-queue-${value}`,
  })),
)
watch([queue, city], () => {
  selectedId.value = null
})
</script>
<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="kati-express-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10"
    >
      <div class="max-w-full overflow-x-auto"><PillTabs v-model="queue" :items="tabs" /></div>
      <NativeSelect v-model="city" class="w-48" :aria-label="t('katiExpress.city')" data-testid="kati-express-city">
        <NativeSelectOption value="">{{ t("katiExpress.allCities") }}</NativeSelectOption>
        <NativeSelectOption
          v-for="option in board.data.value?.villes ?? []"
          :key="option.ville"
          :value="option.ville"
          >{{ option.ville }}</NativeSelectOption
        >
      </NativeSelect>
    </div>

    <div
      class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_18rem] lg:px-10"
    >
      <section class="flex min-w-0 flex-col gap-2" data-testid="kati-express-list">
        <p class="text-xs text-muted-foreground">{{ t(`katiExpress.queueHelp.${queue}`) }}</p>
        <div v-if="board.isPending.value" class="space-y-2">
          <div v-for="n in 4" :key="n" class="h-24 animate-pulse rounded-xl bg-muted" />
        </div>
        <ApiErrorCard v-else-if="board.error.value" :error="board.error.value" @retry="board.refetch()" />
        <EmptyStateCard
          v-else-if="!board.data.value?.elements.length"
          icon="ph:truck"
          :text="t(`katiExpress.empty.${queue}`)"
        />
        <template v-else>
          <OperationsKatiExpressShipmentCard
            v-for="shipment in board.data.value?.elements ?? []"
            :key="shipment.id"
            :shipment="shipment"
            :selected="shipment.id === selectedId"
            @select="selectedId = $event"
          />
        </template>
      </section>

      <div class="min-w-0">
        <OperationsKatiExpressSuggestions
          v-if="selected"
          :key="selected.id"
          :shipment="selected"
          @close="selectedId = null"
        />
        <p v-else class="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {{ t("katiExpress.pick") }}
        </p>
      </div>

      <OperationsKatiExpressCouriers />
    </div>
  </div>
</template>
