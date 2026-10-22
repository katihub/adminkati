<script setup lang="ts">
import type { InstallmentPlan, InstallmentPlanStatus } from "@/types/api/installment-plans"
import { computed, ref } from "vue"
import OperationsInstallmentPlanActionForm from "@/components/operations/installment/PlanActionForm.vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useInstallmentMutations } from "@/composables/useInstallmentPlans"
import { useToastAction } from "@/composables/useToastAction"
import { formatMontant } from "@/utils/money"

const props = defineProps<{ plan: InstallmentPlan }>()

const IN_PROGRESS = new Set<InstallmentPlanStatus>(["ouvert", "reserve", "solde"])

const { t, locale } = useI18n()
const { retryConversion } = useInstallmentMutations()
const run = useToastAction()
const action = ref<"failure" | "refund" | null>(null)

const canFail = computed(() => IN_PROGRESS.has(props.plan.statut) && !props.plan.commande)
const canRefund = computed(
  () => props.plan.statut === "annule_defaillance" && !props.plan.rembourse && props.plan.montantVerseFcfa > 0,
)
// Fees paid but no order yet: the conversion failed after the money arrived.
const canRetry = computed(
  () =>
    props.plan.statut === "solde" &&
    props.plan.versements.some(payment => payment.nature === "livraison" && payment.statut === "recu"),
)
const contact = computed(() =>
  [props.plan.client.nom, props.plan.client.courriel, props.plan.client.telephone].filter(Boolean).join(" · "),
)
const progress = computed(() =>
  t("operations.installments.plans.progress", {
    paid: formatMontant(props.plan.montantVerseFcfa, locale.value).exact,
    total: formatMontant(props.plan.totalProduitsFcfa, locale.value).exact,
    due: new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(new Date(props.plan.echeanceLe)),
  }),
)

function retry() {
  void run(() => retryConversion.mutateAsync(props.plan.reference), t("operations.installments.plans.converted"))
}
</script>

<template>
  <li class="grid gap-2 py-3" :data-testid="`installment-plan-${plan.reference}`">
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-mono text-sm font-semibold">{{ plan.reference }}</span>
      <Badge variant="outline">{{ t(`operations.installments.status.${plan.statut}`) }}</Badge>
      <Badge v-if="plan.rembourse">{{ t("operations.installments.plans.refundDone") }}</Badge>
      <span class="text-sm">{{ plan.produit.nom }} · {{ plan.boutique.nom }}</span>
    </div>
    <p class="text-xs text-muted-foreground">{{ contact }}</p>
    <p class="text-sm">
      {{ progress }}
      <span v-if="plan.commande"> · {{ t("operations.installments.plans.order", { order: plan.commande }) }}</span>
      <span v-if="plan.motifCloture" class="text-muted-foreground"> · {{ plan.motifCloture }}</span>
    </p>
    <div class="flex flex-wrap gap-2">
      <Button
        v-if="canFail"
        size="sm"
        variant="outline"
        :data-testid="`installment-plan-failure-${plan.reference}`"
        @click="action = 'failure'"
        >{{ t("operations.installments.plans.failure") }}</Button
      >
      <Button
        v-if="canRefund"
        size="sm"
        variant="outline"
        :data-testid="`installment-plan-refund-${plan.reference}`"
        @click="action = 'refund'"
        >{{ t("operations.installments.plans.refund") }}</Button
      >
      <Button v-if="canRetry" size="sm" variant="outline" @click="retry">{{
        t("operations.installments.plans.retry")
      }}</Button>
    </div>
    <OperationsInstallmentPlanActionForm
      v-if="action"
      :key="action"
      :kind="action"
      :reference="plan.reference"
      @close="action = null"
    />
  </li>
</template>
