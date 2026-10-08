<script setup lang="ts">
import { Button } from "@/components/ui/button"

defineProps<{
  pending: boolean
  error: string
}>()

const emit = defineEmits<{ trigger: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-3">
    <p v-if="error" role="alert" class="text-xs text-destructive" data-testid="taxonomy-recalculate-error">
      {{ error }}
    </p>
    <Button
      variant="outline"
      size="sm"
      data-testid="taxonomy-recalculate-trigger"
      :disabled="pending"
      :aria-busy="pending ? true : undefined"
      @click="emit('trigger')"
    >
      <Spinner v-if="pending" data-icon="inline-start" />
      <Icon v-else name="ph:arrows-clockwise" size="16" aria-hidden="true" />
      {{ t("taxonomy.recalculate.trigger") }}
    </Button>
  </div>
</template>
