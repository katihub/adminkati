<script setup lang="ts">
import { Button } from "@/components/ui/button"

const { changes, saving, announcement } = defineProps<{
  changes: number
  saving: boolean
  announcement: string
}>()

const emit = defineEmits<{
  cancel: []
  save: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="points-of-sale-arrange-bar"
    class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-foreground"
  >
    <span class="text-sm font-semibold text-primary">{{
      t("pointsOfSale.arrange.title", { count: changes }, changes)
    }}</span>
    <span class="text-xs text-muted-foreground">{{ t("pointsOfSale.arrange.hint") }}</span>
    <span class="flex-1" />
    <Button
      data-testid="points-of-sale-arrange-cancel"
      variant="ghost"
      size="sm"
      class="hover:bg-primary/10"
      :disabled="saving"
      @click="emit('cancel')"
    >
      {{ t("pointsOfSale.arrange.cancel") }}
    </Button>
    <Button
      data-testid="points-of-sale-arrange-save"
      size="sm"
      :disabled="saving || changes === 0"
      :aria-busy="saving || undefined"
      @click="emit('save')"
    >
      <Spinner v-if="saving" data-icon="inline-start" />
      {{ t("pointsOfSale.arrange.save") }}
    </Button>
    <p data-testid="points-of-sale-arrange-announcement" class="sr-only" aria-live="polite">
      {{ announcement }}
    </p>
  </div>
</template>
