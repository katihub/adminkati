<script setup lang="ts">
import type { PointVenteContactField } from "@/utils/point-of-sale"

/** One published detail in a row: its value, or a "+ Add" affordance when it is missing. */
const {
  field,
  name,
  canWrite,
  missing,
  text,
  href = null,
  extra = "",
} = defineProps<{
  field: PointVenteContactField
  name: string
  canWrite: boolean
  missing: boolean
  text: string
  href?: string | null
  extra?: string
}>()

const emit = defineEmits<{ fix: [] }>()
</script>

<template>
  <PointsOfSaleMissingCell v-if="missing" :field="field" :name="name" :can-write="canWrite" @fix="emit('fix')" />
  <a
    v-else-if="href"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
  >
    {{ text }}
    <Icon name="ph:arrow-up-right" size="14" aria-hidden="true" />
  </a>
  <span v-else class="block max-w-44 truncate">
    {{ text }}
    <span v-if="extra" class="text-xs text-muted-foreground">{{ extra }}</span>
  </span>
</template>
