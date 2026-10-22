<script setup lang="ts">
import type { InstallmentPlanStatus } from "@/types/api/installment-plans"
import { ref } from "vue"
import OperationsInstallmentPlanRow from "@/components/operations/installment/PlanRow.vue"
import { useInstallmentPlanList } from "@/composables/useInstallmentPlans"

const STATUSES: InstallmentPlanStatus[] = [
  "ouvert",
  "reserve",
  "solde",
  "converti",
  "expire",
  "abandonne",
  "annule_defaillance",
]

const { t } = useI18n()
const status = ref<InstallmentPlanStatus | "">("")
const plans = useInstallmentPlanList(status)
</script>

<template>
  <section class="mt-4 rounded-lg border border-border bg-card p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="font-heading font-semibold">{{ t("operations.installments.plans.title") }}</h3>
      <select
        v-model="status"
        class="h-9 rounded-md border border-input bg-background px-3 text-sm"
        data-testid="installment-plans-status"
      >
        <option value="">{{ t("operations.installments.plans.allStatuses") }}</option>
        <option v-for="value in STATUSES" :key="value" :value="value">
          {{ t(`operations.installments.status.${value}`) }}
        </option>
      </select>
    </div>
    <div v-if="plans.isPending.value" class="mt-4 space-y-2">
      <div v-for="n in 3" :key="n" class="h-12 animate-pulse rounded-lg bg-muted" />
    </div>
    <ApiErrorCard v-else-if="plans.error.value" :error="plans.error.value" @retry="plans.refetch()" />
    <p v-else-if="!plans.data.value?.length" class="mt-4 text-sm text-muted-foreground">
      {{ t("operations.installments.plans.empty") }}
    </p>
    <ul v-else class="mt-4 divide-y divide-border">
      <OperationsInstallmentPlanRow v-for="plan in plans.data.value" :key="plan.reference" :plan="plan" />
    </ul>
  </section>
</template>
