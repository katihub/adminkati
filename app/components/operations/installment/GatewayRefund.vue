<script setup lang="ts">
import type { InstallmentPlan } from "@/types/api/installment-plans"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useInstallmentMutations } from "@/composables/useInstallmentPlans"
import { useToastAction } from "@/composables/useToastAction"

/* THE KRATOSPAY REFUND OF A PLAN CANCELLED FOR FAILURE. The money goes back to
   the number of the last paid instalment; the debt only leaves the ledger once
   Kratospay confirms. An unknown outcome is reconciled, never resent. */
const props = defineProps<{ plan: InstallmentPlan }>()

const { t } = useI18n()
const { refundViaGateway, reconcileRefund } = useInstallmentMutations()
const run = useToastAction()
const refund = computed(() => props.plan.remboursementPasserelle ?? null)
const canSend = computed(() => !refund.value || refund.value.statut === "echec")
const canCheck = computed(() => refund.value?.statut === "soumis" || refund.value?.statut === "verification_requise")

function send() {
  void run(() => refundViaGateway.mutateAsync(props.plan.reference), t("operations.installments.plans.gatewaySent"))
}
function check() {
  void run(() => reconcileRefund.mutateAsync(props.plan.reference), t("operations.installments.plans.gatewayChecked"))
}
</script>

<template>
  <span class="flex flex-wrap items-center gap-2">
    <Badge v-if="refund" variant="outline" :data-testid="`installment-plan-gateway-${plan.reference}`">{{
      t(`operations.installments.plans.gatewayStatus.${refund.statut}`, { phone: refund.telephone })
    }}</Badge>
    <Button
      v-if="canSend"
      size="sm"
      :disabled="refundViaGateway.isPending.value"
      :data-testid="`installment-plan-gateway-refund-${plan.reference}`"
      @click="send"
      >{{ t("operations.installments.plans.gatewayRefund") }}</Button
    >
    <Button
      v-if="canCheck"
      size="sm"
      variant="outline"
      :disabled="reconcileRefund.isPending.value"
      :data-testid="`installment-plan-gateway-check-${plan.reference}`"
      @click="check"
      >{{ t("operations.installments.plans.gatewayCheck") }}</Button
    >
  </span>
</template>
