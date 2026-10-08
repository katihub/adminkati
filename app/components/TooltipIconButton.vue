<script setup lang="ts">
import type { ButtonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

defineOptions({ inheritAttrs: false })

const {
  icon,
  label,
  tooltip,
  variant = "secondary",
} = defineProps<{
  icon: string
  /** Accessible name, and the tooltip text when `tooltip` is not given. */
  label: string
  /** Longer hover text, e.g. explaining what the button does. Falls back to `label`. */
  tooltip?: string
  variant?: ButtonVariants["variant"]
}>()
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          v-bind="$attrs"
          type="button"
          :variant="variant"
          size="icon-sm"
          :aria-label="label"
          class="rounded-full"
        >
          <Icon :name="icon" size="16" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <ThemedTooltipContent>
        {{ tooltip ?? label }}
      </ThemedTooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
