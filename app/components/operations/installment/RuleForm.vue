<script setup lang="ts">
import type { InstallmentCategoryRule, InstallmentMode } from "@/types/api/installment-plans"
import { computed, reactive } from "vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useInstallmentMutations } from "@/composables/useInstallmentPlans"
import { useToastAction } from "@/composables/useToastAction"

const props = defineProps<{ category: InstallmentCategoryRule }>()
const emit = defineEmits<{ done: [] }>()

const { t } = useI18n()
const { updateRule } = useInstallmentMutations()
const run = useToastAction()
const rule = props.category.regle
// Percentages on screen, basis points on the wire.
const form = reactive({
  active: rule.actif,
  maxDays: rule.dureeMaxJours,
  depositPercent: rule.apportInitialBps / 100,
  minPayment: rule.versementMinFcfa,
  thresholdPercent: rule.seuilReservationBps / 100,
  minPrice: rule.prixMinFcfa,
  mode: rule.mode as InstallmentMode,
  instalments: rule.nombreTranches ?? (undefined as number | undefined),
  inactivityDays: rule.inactiviteMaxJours,
})

const whole = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
const percent = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100

const error = computed(() => {
  if (!whole(form.maxDays, 7, 730)) return t("operations.installments.rule.errors.duration")
  if (!percent(form.depositPercent) || !percent(form.thresholdPercent))
    return t("operations.installments.rule.errors.percent")
  if (!whole(form.minPayment, 0, 10_000_000) || !whole(form.minPrice, 0, 100_000_000))
    return t("operations.installments.rule.errors.amount")
  if (!whole(form.inactivityDays, 1, 365)) return t("operations.installments.rule.errors.inactivity")
  if (form.mode === "tranches_fixes" && !whole(form.instalments, 2, 24))
    return t("operations.installments.rule.errors.instalments")
  return ""
})

function save() {
  if (error.value) return
  void run(
    () =>
      updateRule.mutateAsync({
        categoryId: props.category.id,
        body: {
          actif: form.active,
          dureeMaxJours: form.maxDays,
          apportInitialBps: Math.round(form.depositPercent * 100),
          versementMinFcfa: form.minPayment,
          seuilReservationBps: Math.round(form.thresholdPercent * 100),
          prixMinFcfa: form.minPrice,
          mode: form.mode,
          nombreTranches: form.mode === "tranches_fixes" ? (form.instalments ?? null) : null,
          inactiviteMaxJours: form.inactivityDays,
        },
      }),
    t("operations.installments.rule.saved", { category: props.category.nom }),
  ).then(ok => ok && emit("done"))
}
</script>

<template>
  <form class="mt-3 grid gap-4 rounded-lg border border-border bg-muted/40 p-4" @submit.prevent="save">
    <label class="flex items-center gap-2 text-sm">
      <input v-model="form.active" type="checkbox" class="size-4" data-testid="installment-rule-active" />
      {{ t("operations.installments.rule.active") }}
    </label>
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="grid gap-1.5">
        <Label for="rule-days">{{ t("operations.installments.rule.maxDays") }}</Label>
        <Input id="rule-days" v-model.number="form.maxDays" type="number" min="7" max="730" />
      </div>
      <div class="grid gap-1.5">
        <Label for="rule-deposit">{{ t("operations.installments.rule.deposit") }}</Label>
        <Input
          id="rule-deposit"
          v-model.number="form.depositPercent"
          type="number"
          min="0"
          max="100"
          step="any"
          data-testid="installment-rule-deposit"
        />
      </div>
      <div class="grid gap-1.5">
        <Label for="rule-min-payment">{{ t("operations.installments.rule.minPayment") }}</Label>
        <Input id="rule-min-payment" v-model.number="form.minPayment" type="number" min="0" />
      </div>
      <div class="grid gap-1.5">
        <Label for="rule-threshold">{{ t("operations.installments.rule.threshold") }}</Label>
        <Input
          id="rule-threshold"
          v-model.number="form.thresholdPercent"
          type="number"
          min="0"
          max="100"
          step="any"
          data-testid="installment-rule-threshold"
        />
      </div>
      <div class="grid gap-1.5">
        <Label for="rule-min-price">{{ t("operations.installments.rule.minPrice") }}</Label>
        <Input id="rule-min-price" v-model.number="form.minPrice" type="number" min="0" />
      </div>
      <div class="grid gap-1.5">
        <Label for="rule-inactivity">{{ t("operations.installments.rule.inactivity") }}</Label>
        <Input id="rule-inactivity" v-model.number="form.inactivityDays" type="number" min="1" max="365" />
      </div>
      <div class="grid gap-1.5">
        <Label for="rule-mode">{{ t("operations.installments.rule.mode") }}</Label>
        <select
          id="rule-mode"
          v-model="form.mode"
          class="h-9 rounded-md border border-input bg-background px-3 text-sm"
          data-testid="installment-rule-mode"
        >
          <option value="libre">{{ t("operations.installments.rule.modes.libre") }}</option>
          <option value="tranches_fixes">{{ t("operations.installments.rule.modes.tranches_fixes") }}</option>
        </select>
      </div>
      <div v-if="form.mode === 'tranches_fixes'" class="grid gap-1.5">
        <Label for="rule-instalments">{{ t("operations.installments.rule.instalments") }}</Label>
        <Input
          id="rule-instalments"
          v-model.number="form.instalments"
          type="number"
          min="2"
          max="24"
          data-testid="installment-rule-instalments"
        />
      </div>
    </div>
    <p v-if="error" class="text-xs text-destructive" role="alert" data-testid="installment-rule-error">{{ error }}</p>
    <div class="flex gap-2">
      <Button type="submit" :disabled="updateRule.isPending.value" data-testid="installment-rule-save">{{
        t("operations.installments.save")
      }}</Button>
      <Button type="button" variant="ghost" @click="emit('done')">{{ t("operations.installments.cancel") }}</Button>
    </div>
  </form>
</template>
