<script setup lang="ts">
import OperationsInstallmentPlansList from "@/components/operations/installment/PlansList.vue"
import OperationsInstallmentRulesPanel from "@/components/operations/installment/RulesPanel.vue"
import OperationsInstallmentSettingsPanel from "@/components/operations/installment/SettingsPanel.vue"

/* PAY IN INSTALMENTS. A product paid bit by bit and delivered once paid — not a
   credit. The direction switches the mode on, sets the rules of each main
   category (sub-categories inherit them), follows the plans and cancels one
   when the shop or KatiMarket cannot deliver, which makes all of it refundable. */
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10"
    data-testid="installment-plans-workspace"
  >
    <OperationsInstallmentSettingsPanel />
    <OperationsInstallmentRulesPanel />
    <OperationsInstallmentPlansList />
  </div>
</template>
