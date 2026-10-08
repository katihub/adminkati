<script setup lang="ts">
import type { CommandeDetail } from "@/types/api/commandes"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatMontant } from "@/utils/money"
import { PAYMENT_STATUS_TONE } from "@/utils/payment-status"

const { order, canCollect = false } = defineProps<{
  order: CommandeDetail
  canCollect?: boolean
}>()

const emit = defineEmits<{
  collect: []
}>()

const { locale, t } = useI18n()
const total = computed(() => order.totalFacturableTtc ?? order.totalFermeTtc ?? order.totalEstimeTtc)

const balanceTone = computed(() => {
  const hasRemaining = (order.resteAPayer ?? 0) > 0
  return {
    box: hasRemaining ? "bg-amber-500/10" : "bg-emerald-500/10",
    label: hasRemaining ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
    amount: hasRemaining ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
  }
})
</script>

<template>
  <section
    v-if="order.totalEstimeTtc !== undefined"
    class="rounded-2xl bg-card p-5 space-y-4"
    data-testid="orders-detail-payment-status"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="ph:credit-card" size="15" aria-hidden="true" />
        </div>
        <h3 class="font-heading text-sm font-semibold text-foreground">
          {{ t("orders.detail.paymentStatusTitle") }}
        </h3>
      </div>
      <Badge
        v-if="order.statutPaiement"
        :data-status="order.statutPaiement"
        class="border-0! rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :class="PAYMENT_STATUS_TONE[order.statutPaiement]"
      >
        {{ t(`orders.paymentStatus.${order.statutPaiement}`) }}
      </Badge>
    </div>

    <!-- Reste à Payer Callout Block without borders -->
    <div
      v-if="order.resteAPayer !== undefined"
      class="rounded-xl p-4 flex items-center justify-between gap-3 transition-colors"
      :class="balanceTone.box"
    >
      <div>
        <span class="text-xs font-medium block" :class="balanceTone.label">
          {{ t("orders.detail.remaining") }}
        </span>
        <span class="font-heading text-xl font-bold font-mono tracking-tight" :class="balanceTone.amount">
          {{ formatMontant(order.resteAPayer, locale).affiche }}
        </span>
      </div>

      <Button
        v-if="canCollect && order.resteAPayer > 0"
        type="button"
        size="sm"
        class="h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow-none px-3.5 flex items-center gap-1.5 transition-all"
        data-testid="orders-detail-payment-collect-button"
        @click="emit('collect')"
      >
        <Icon name="ph:hand-coins" size="15" aria-hidden="true" />
        <span>{{ t("orders.detail.collect") }}</span>
      </Button>

      <span
        v-else-if="order.resteAPayer === 0"
        class="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
      >
        <Icon name="ph:check-circle-fill" size="14" aria-hidden="true" />
        <span>{{ t("orders.detail.settled") }}</span>
      </span>
    </div>

    <!-- Amount Breakdown Details -->
    <dl class="space-y-2.5 text-xs sm:text-sm">
      <div class="flex items-center justify-between gap-3 text-muted-foreground">
        <div>
          <dt class="inline text-foreground">
            {{ t("orders.detail.subtotal") }}
          </dt>
          <dd class="inline text-xs text-muted-foreground ml-1.5">
            ({{ t("orders.listPanel.itemCount", { count: order.ligneCount }) }})
          </dd>
        </div>
        <dd class="font-mono text-foreground font-medium">
          {{ formatMontant(order.totalEstimeTtc, locale).affiche }}
        </dd>
      </div>

      <div
        v-if="total !== undefined"
        class="flex items-center justify-between gap-3 pt-2"
        data-testid="orders-detail-total"
      >
        <dt class="font-semibold text-foreground">
          {{ t("orders.detail.totalPayment") }}
        </dt>
        <dd
          class="font-heading text-base sm:text-lg font-bold font-mono text-foreground"
          :title="formatMontant(total, locale).exact"
        >
          {{ formatMontant(total, locale).affiche }}
        </dd>
      </div>

      <div class="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
        <Icon name="ph:wallet" size="14" aria-hidden="true" class="shrink-0 text-muted-foreground" />
        <span>
          {{ t("orders.detail.paymentMethod") }} :
          <strong class="font-medium text-foreground">{{
            t(`orders.paymentMethods.${order.modePaiementSouhaite}`)
          }}</strong>
        </span>
      </div>
    </dl>
  </section>
</template>
