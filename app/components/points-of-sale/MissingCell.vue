<script setup lang="ts">
import type { PointVenteContactField } from "@/utils/point-of-sale"

const { field, name, canWrite } = defineProps<{
  field: PointVenteContactField
  name: string
  canWrite: boolean
}>()

const emit = defineEmits<{ fix: [] }>()

const { t } = useI18n()
</script>

<template>
  <button
    v-if="canWrite"
    type="button"
    :data-testid="`points-of-sale-row-add-${field}`"
    :aria-label="t('pointsOfSale.table.addLabel', { field: t(`pointsOfSale.fields.${field}`), name })"
    class="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-amber-400 bg-amber-50 px-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
    @click="emit('fix')"
  >
    <Icon name="ph:plus" size="12" aria-hidden="true" />
    {{ t("pointsOfSale.table.add") }}
  </button>
  <span v-else class="text-muted-foreground">{{ t("pointsOfSale.table.none") }}</span>
</template>
