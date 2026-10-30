<script setup lang="ts">
import type { KatiExpressShipment, KatiExpressSuggestion } from "@/composables/useKatiExpress"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useKatiExpressAssign, useKatiExpressSuggestions } from "@/composables/useKatiExpress"
import { apiErrorText } from "@/utils/api-error"

/**
 * The detail of one shipment and the ranked couriers for it. Nothing is assigned until a team
 * member clicks: the button calls the existing assignment route, which re-checks everything.
 */
const { shipment } = defineProps<{ shipment: KatiExpressShipment }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const query = useKatiExpressSuggestions(() => shipment.id)
const assign = useKatiExpressAssign()
const ASSIGNABLE = ["planifiee", "a_affecter", "reportee", "echec", "affectee"]
const assignable = computed(() => ASSIGNABLE.includes(shipment.statut))
const suggestions = computed(() => query.data.value?.suggestions ?? [])
const recommended = computed(() => query.data.value?.recommandee ?? null)
const carriedBy = computed(() =>
  shipment.agentCourant ? t("katiExpress.carriedBy", { name: shipment.agentCourant.nom }) : "",
)

async function choose(suggestion: KatiExpressSuggestion) {
  try {
    await assign.mutateAsync({ expeditionId: shipment.id, agentId: suggestion.agentId })
    toast.success(t("katiExpress.assigned", { name: suggestion.nom, reference: shipment.reference }))
    emit("close")
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>
<template>
  <section class="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4" data-testid="kati-express-detail">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-mono text-xs text-muted-foreground">{{ shipment.reference }}</p>
        <h3 class="font-heading text-lg font-semibold">{{ shipment.quartier ?? "—" }} · {{ shipment.ville }}</h3>
        <p class="text-sm text-muted-foreground">{{ shipment.adresseFigee?.repere }}</p>
      </div>
      <Button size="sm" variant="ghost" @click="emit('close')">{{ t("katiExpress.close") }}</Button>
    </div>

    <OperationsKatiExpressShipmentFacts :shipment="shipment" />

    <p v-if="!assignable" class="text-sm text-muted-foreground">{{ carriedBy }}</p>
    <template v-else>
      <h4 class="text-sm font-semibold">{{ t("katiExpress.suggestionsTitle") }}</h4>
      <p class="text-xs text-muted-foreground">{{ t("katiExpress.suggestionsHelp") }}</p>
      <Skeleton v-if="query.isPending.value" class="h-32 rounded-xl" />
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <p v-else-if="!suggestions.length" class="text-sm text-muted-foreground">{{ t("katiExpress.noCourier") }}</p>
      <ol v-else class="flex flex-col gap-2">
        <OperationsKatiExpressSuggestionItem
          v-for="suggestion in suggestions"
          :key="suggestion.agentId"
          :suggestion="suggestion"
          :recommended="suggestion.agentId === recommended"
          :pending="assign.isPending.value"
          @choose="choose"
        />
      </ol>
    </template>
  </section>
</template>
