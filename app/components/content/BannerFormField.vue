<script setup lang="ts">
import { Label } from "@/components/ui/label"

/**
 * One field of the banner form: an icon and a label on top, with an optional note ("Optional")
 * and a trailing slot (a counter, a badge) on the right of that header, then the field itself.
 */
const {
  icon,
  label,
  labelFor,
  flush = false,
} = defineProps<{
  icon: string
  label: string
  /** The id of the control the label names, when there is exactly one. */
  labelFor?: string
  /** Let the field span the full width instead of lining up under the label. */
  flush?: boolean
}>()
</script>

<template>
  <div class="space-y-2">
    <div class="flex min-h-6 items-center gap-3">
      <Icon :name="icon" size="20" class="shrink-0 opacity-80" aria-hidden="true" />
      <Label :for="labelFor" class="text-sm text-foreground/80">
        {{ label }}
      </Label>
      <span v-if="$slots.note" class="text-xs text-muted-foreground">
        <slot name="note" />
      </span>
      <div v-if="$slots.trailing" class="ml-auto flex items-center gap-2">
        <slot name="trailing" />
      </div>
    </div>
    <div :class="!flush && 'ml-8'">
      <slot />
    </div>
  </div>
</template>
