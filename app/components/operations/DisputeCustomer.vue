<script setup lang="ts">
import type { MarketplaceReturnListItem } from "@/types/api/marketplace-operations"
import { computed } from "vue"
import { formatFrozenAddress } from "@/utils/frozen-address"

/* WHO TO CALL AND WHERE THE PARCEL WENT. The person working a dispute (the
   direction, the counter, or the shop's KATI focal point) needs the customer's
   contact details and the delivery address of the order. */
const props = defineProps<{ demande: MarketplaceReturnListItem["demande"] }>()

const { t } = useI18n()
const phones = computed(() =>
  [
    ...new Set([props.demande.commande.telephoneLivraison, props.demande.client.profil?.telephone].filter(Boolean)),
  ].join(" · "),
)
const address = computed(() => formatFrozenAddress(props.demande.commande.adresseFigee))
</script>

<template>
  <section class="rounded-lg border border-border bg-card p-4" data-testid="dispute-customer">
    <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.customer.title") }}</h3>
    <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-muted-foreground">{{ t("operations.disputes.customer.name") }}</dt>
        <dd class="font-medium">{{ demande.client.profil?.nom ?? "—" }}</dd>
      </div>
      <div>
        <dt class="text-muted-foreground">{{ t("operations.disputes.customer.email") }}</dt>
        <dd class="font-medium">{{ demande.client.courriel ?? "—" }}</dd>
      </div>
      <div>
        <dt class="text-muted-foreground">{{ t("operations.disputes.customer.phone") }}</dt>
        <dd class="font-medium" data-testid="dispute-customer-phone">{{ phones || "—" }}</dd>
      </div>
      <div>
        <dt class="text-muted-foreground">{{ t("operations.disputes.customer.address") }}</dt>
        <dd class="font-medium">{{ address || "—" }}</dd>
      </div>
    </dl>
  </section>
</template>
