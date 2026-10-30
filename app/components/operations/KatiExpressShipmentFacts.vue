<script setup lang="ts">
import type { KatiExpressShipment } from "@/composables/useKatiExpress"
import { formatMontant } from "@/utils/money"
/** Where to pick the parcel up, whom to call, how much to collect, which order. */
const { shipment } = defineProps<{ shipment: KatiExpressShipment }>()
const { t, locale } = useI18n()
const pickupAddress = computed(
  () => shipment.sousCommande.boutique.adresseRetrait ?? shipment.sousCommande.boutique.ville ?? "—",
)
const cash = computed(() =>
  shipment.montantACollecterFcfa > 0
    ? formatMontant(shipment.montantACollecterFcfa, locale.value).exact
    : t("katiExpress.prepaid"),
)
</script>
<template>
  <dl class="grid grid-cols-2 gap-3 text-sm">
    <div>
      <dt class="text-xs text-muted-foreground">{{ t("katiExpress.pickup") }}</dt>
      <dd>{{ shipment.sousCommande.boutique.nom }}</dd>
      <dd class="text-xs text-muted-foreground">{{ pickupAddress }}</dd>
    </div>
    <div>
      <dt class="text-xs text-muted-foreground">{{ t("katiExpress.customerPhone") }}</dt>
      <dd>{{ shipment.telephoneClientCapture }}</dd>
    </div>
    <div>
      <dt class="text-xs text-muted-foreground">{{ t("katiExpress.cash") }}</dt>
      <dd>{{ cash }}</dd>
    </div>
    <div>
      <dt class="text-xs text-muted-foreground">{{ t("katiExpress.order") }}</dt>
      <dd>{{ shipment.sousCommande.commande.reference }}</dd>
    </div>
  </dl>
</template>
