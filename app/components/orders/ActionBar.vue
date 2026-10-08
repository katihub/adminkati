<script setup lang="ts">
import type { ButtonVariants } from "@/components/ui/button"
import type { StatutCommande } from "@/types/api/commandes"
import type { Role } from "@/types/session"
import type { TransitionSeverity } from "@/utils/order-transition-actions"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { ORDER_TRANSITION_ICON, ORDER_TRANSITION_SEVERITY } from "@/utils/order-transition-actions"
import { eligibleTransitions } from "@/utils/order-transitions"

const {
  status,
  roles,
  busy = false,
} = defineProps<{
  status: StatutCommande
  roles: readonly Role[]
  busy?: boolean
}>()

const emit = defineEmits<{
  select: [status: StatutCommande]
}>()

const SEVERITY_VARIANT: Record<TransitionSeverity, ButtonVariants["variant"]> = {
  primary: "default",
  secondary: "outline",
  warning: "outline",
  destructive: "destructive",
}

/** `outline` has no amber reading of its own — layered on top of it for the one severity
 *  shadcn's button variants don't cover. */
const WARNING_CLASS =
  "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/20"

const { t } = useI18n()
const transitions = computed(() => eligibleTransitions(status, roles))

function severityOf(transition: StatutCommande): TransitionSeverity {
  return ORDER_TRANSITION_SEVERITY[status]?.[transition] ?? "secondary"
}
</script>

<template>
  <div
    v-if="transitions.length > 0"
    class="flex flex-wrap items-center justify-end gap-2"
    data-testid="orders-action-bar"
  >
    <Button
      v-for="transition in transitions"
      :key="transition"
      type="button"
      :variant="SEVERITY_VARIANT[severityOf(transition)]"
      :class="severityOf(transition) === 'warning' ? WARNING_CLASS : undefined"
      data-testid="orders-transition-action"
      :data-transition="transition"
      :data-severity="severityOf(transition)"
      :disabled="busy"
      @click="emit('select', transition)"
    >
      <Icon :name="ORDER_TRANSITION_ICON[transition]" size="16" aria-hidden="true" />
      {{ t(`orders.actions.transition.${transition}`) }}
    </Button>
  </div>
</template>
