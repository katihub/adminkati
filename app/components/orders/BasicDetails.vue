<script setup lang="ts">
import type { CommandeDetail } from "@/types/api/commandes"
import { computed } from "vue"
import { useComptoirs } from "@/composables/usePointsVente"
import { comptoirLabel } from "@/utils/comptoirs"
import { formatDateCourte } from "@/utils/dates"

const { order } = defineProps<{
  order: CommandeDetail
}>()

const { locale, t } = useI18n()
const { comptoirs } = useComptoirs()

/**
 * UN TIRET NE DIT RIEN. Une commande sans comptoir n'est pas une commande dont le
 * comptoir manquerait : elle part à domicile, et c'est précisément ce qui la
 * laisse ouverte à tous les membres du comptoir. L'écran l'écrit.
 */
const comptoirText = computed(() => {
  if (order.comptoir) return comptoirLabel(comptoirs.value, order.comptoir)
  if (order.modeRemise === "domicile") return t("orders.detail.noCounter")
  return "—"
})
</script>

<template>
  <section class="rounded-2xl bg-card p-5" data-testid="orders-detail-basic-details">
    <div class="mb-4 flex items-center gap-2">
      <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name="ph:info" size="15" aria-hidden="true" />
      </div>
      <h3 class="font-heading text-sm font-semibold text-foreground">
        {{ t("orders.detail.basicDetailsTitle") }}
      </h3>
    </div>
    <dl class="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs sm:text-sm">
      <div class="col-span-2">
        <dt class="text-xs text-muted-foreground">
          {{ t("orders.detail.orderId") }}
        </dt>
        <dd class="mt-0.5 font-mono font-medium text-foreground">
          {{ order.reference }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t("orders.detail.orderDate") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ formatDateCourte(order.creeLe, locale) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t("orders.detail.payment") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ t(`orders.paymentMethods.${order.modePaiementSouhaite}`) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t("orders.detail.delivery") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ t(`orders.deliveryModes.${order.modeRemise}`) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t("orders.detail.counter") }}
        </dt>
        <dd
          class="mt-0.5 font-medium text-foreground"
          data-testid="orders-detail-comptoir"
          :data-comptoir="order.comptoir ?? ''"
        >
          {{ comptoirText }}
        </dd>
      </div>
    </dl>
  </section>
</template>
