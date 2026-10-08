<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

defineOptions({ inheritAttrs: false })

const { label, text } = defineProps<{
  /** Accessible name of the trigger: the icon alone carries no text. */
  label?: string
  text: string
}>()

const { t } = useI18n()
const accessibleName = computed(() => label ?? t("infoTip.label"))
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          v-bind="$attrs"
          type="button"
          variant="ghost"
          size="icon-xs"
          :aria-label="accessibleName"
          class="size-4 rounded-full text-muted-foreground"
        >
          <Icon name="ph:info" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <ThemedTooltipContent>
        {{ text }}
      </ThemedTooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
