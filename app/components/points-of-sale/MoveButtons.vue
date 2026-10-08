<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/ui/button"

const { id, name, isFirst, isLast } = defineProps<{
  id: number
  name: string
  isFirst: boolean
  isLast: boolean
}>()

const emit = defineEmits<{ move: [offset: -1 | 1] }>()

const { t } = useI18n()

const buttons = computed(() => [
  {
    offset: -1 as const,
    key: "up",
    icon: "ph:arrow-up",
    label: t("pointsOfSale.list.moveUp", { name }),
    disabled: isFirst,
  },
  {
    offset: 1 as const,
    key: "down",
    icon: "ph:arrow-down",
    label: t("pointsOfSale.list.moveDown", { name }),
    disabled: isLast,
  },
])
</script>

<template>
  <span class="flex items-center gap-1">
    <Button
      v-for="button in buttons"
      :key="button.key"
      variant="ghost"
      size="icon-sm"
      :data-testid="`points-of-sale-row-move-${button.key}`"
      :data-move="`${id}:${button.offset}`"
      :aria-label="button.label"
      :disabled="button.disabled"
      @click="emit('move', button.offset)"
    >
      <Icon :name="button.icon" size="16" aria-hidden="true" />
    </Button>
  </span>
</template>
