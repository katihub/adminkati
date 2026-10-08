<script setup lang="ts">
import { computed, useId } from "vue"
import { Label } from "@/components/ui/label"

/**
 * Label, control, help and error for one form field. The shared binding keeps all controls wired
 * to their errors while help remains an optional, compact label-adjacent tooltip.
 */
const {
  label,
  hint = "",
  detail = "",
  error = "",
  badge = "",
} = defineProps<{
  label: string
  hint?: string
  detail?: string
  error?: string
  /** A short state next to the label, such as a key that still follows the name. */
  badge?: string
}>()

defineSlots<{
  default: (props: {
    field: { id: string; "aria-describedby": string | undefined; "aria-invalid": boolean }
  }) => unknown
  after?: () => unknown
}>()

const id = useId()
const errorId = useId()
/** Spread onto the control with `v-bind`, so each field gets the same three attributes. */
const field = computed(() => ({
  id: id,
  "aria-describedby": error ? errorId : undefined,
  "aria-invalid": Boolean(error),
}))
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center gap-2">
      <Label :for="id" class="text-muted-foreground">{{ label }}</Label>
      <InfoTip v-if="hint" :text="hint" />
      <span
        v-if="badge"
        class="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
        >{{ badge }}</span
      >
    </div>
    <slot :field="field" />
    <div v-if="detail || $slots.after" class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <p v-if="detail" class="text-xs text-muted-foreground">
        {{ detail }}
      </p>
      <slot name="after" />
    </div>
    <p v-if="error" :id="errorId" data-testid="points-of-sale-form-error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
