<script setup lang="ts">
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInstallmentMutations } from "@/composables/useInstallmentPlans"
import { useToastAction } from "@/composables/useToastAction"

const props = defineProps<{ kind: "failure" | "refund"; reference: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { cancelForFailure, markRefunded } = useInstallmentMutations()
const run = useToastAction()
const text = ref("")
const failure = computed(() => props.kind === "failure")
// A failure needs a reason; a refund, the reference of the payout that was made.
const form = computed(() =>
  failure.value
    ? {
        placeholder: t("operations.installments.plans.failureReason"),
        input: "installment-plan-failure-reason",
        confirm: "installment-plan-failure-confirm",
        variant: "destructive" as const,
        minimum: 5,
      }
    : {
        placeholder: t("operations.installments.plans.refundNote"),
        input: "installment-plan-refund-note",
        confirm: "installment-plan-refund-confirm",
        variant: "default" as const,
        minimum: 3,
      },
)

function confirm() {
  const value = text.value.trim()
  if (value.length < form.value.minimum) return
  const action = failure.value
    ? () => cancelForFailure.mutateAsync({ reference: props.reference, motif: value })
    : () => markRefunded.mutateAsync({ reference: props.reference, note: value })
  const success = t(
    failure.value ? "operations.installments.plans.cancelled" : "operations.installments.plans.refunded",
  )
  void run(action, success).then(ok => ok && emit("close"))
}
</script>

<template>
  <form class="flex flex-wrap items-end gap-2" @submit.prevent="confirm">
    <Input v-model="text" class="max-w-md" :placeholder="form.placeholder" :data-testid="form.input" />
    <Button type="submit" size="sm" :variant="form.variant" :data-testid="form.confirm">{{
      t("operations.installments.plans.confirm")
    }}</Button>
    <Button type="button" size="sm" variant="ghost" @click="emit('close')">{{
      t("operations.installments.cancel")
    }}</Button>
    <p v-if="failure" class="w-full text-xs text-muted-foreground">
      {{ t("operations.installments.plans.failureHelp") }}
    </p>
  </form>
</template>
