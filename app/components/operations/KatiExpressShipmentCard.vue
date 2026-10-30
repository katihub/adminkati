<script setup lang="ts">
import type { KatiExpressShipment } from "@/composables/useKatiExpress"
import { Badge } from "@/components/ui/badge"
import { formatMontant } from "@/utils/money"
const { shipment, selected } = defineProps<{ shipment: KatiExpressShipment; selected: boolean }>()
defineEmits<{ select: [id: string] }>()
const { t, locale } = useI18n()
const ready = computed(() => Boolean(shipment.sousCommande.preteLe))
const tone = computed(() =>
  ["echec", "reportee"].includes(shipment.statut) ? "warning" : shipment.statut === "livree" ? "success" : "secondary",
)
</script>
<template>
  <button
    type="button"
    class="flex w-full flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="selected ? 'border-primary ring-1 ring-primary' : 'border-border'"
    :data-testid="`kati-express-shipment-${shipment.id}`"
    @click="$emit('select', shipment.id)"
  >
    <span class="flex flex-wrap items-center justify-between gap-2">
      <span class="font-mono text-xs font-semibold">{{ shipment.reference }}</span>
      <Badge :variant="tone">{{ t(`katiExpress.status.${shipment.statut}`) }}</Badge>
    </span>
    <span class="text-sm font-medium">{{ shipment.quartier ?? "—" }} · {{ shipment.ville }}</span>
    <span class="text-xs text-muted-foreground"
      >{{ t("katiExpress.from", { shop: shipment.sousCommande.boutique.nom }) }} ·
      {{ t("katiExpress.items", { count: shipment.sousCommande._count.lignes }) }}</span
    >
    <span class="flex flex-wrap items-center gap-2 text-xs">
      <Badge v-if="shipment.montantACollecterFcfa > 0" variant="outline">{{
        t("katiExpress.toCollect", { amount: formatMontant(shipment.montantACollecterFcfa, locale).exact })
      }}</Badge>
      <Badge v-else variant="outline">{{ t("katiExpress.prepaid") }}</Badge>
      <Badge :variant="ready ? 'success' : 'secondary'">{{
        t(ready ? "katiExpress.ready" : "katiExpress.preparing")
      }}</Badge>
      <span v-if="shipment.agentCourant" class="text-muted-foreground">· {{ shipment.agentCourant.nom }}</span>
    </span>
  </button>
</template>
