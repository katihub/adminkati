<script setup lang="ts">
import type { Periode } from "@/types/api/statistiques"
import { onMounted, ref } from "vue"
import { Button } from "@/components/ui/button"
import { PERIODES } from "@/utils/periode"

const {
  modelValue,
  busy = false,
  updatedAt = 0,
} = defineProps<{
  modelValue: Periode
  busy?: boolean
  updatedAt?: number
}>()

const emit = defineEmits<{
  "update:modelValue": [value: Periode]
  refresh: []
}>()

const { locale, t } = useI18n()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

function labelFor(periode: Periode) {
  return t(`stats.periods.${periode}`)
}

function updatedLabel() {
  if (!mounted.value || updatedAt <= 0) return ""

  const time = new Intl.DateTimeFormat(locale.value, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(updatedAt)
  return t("stats.actions.updated", { time })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" data-testid="stats-range-picker">
    <div
      role="group"
      :aria-label="t('stats.actions.period')"
      class="flex flex-wrap items-center gap-1 rounded-2xl bg-muted/60 p-1"
    >
      <Button
        v-for="option in PERIODES"
        :key="option"
        variant="ghost"
        size="sm"
        :aria-pressed="modelValue === option"
        :class="modelValue === option && 'bg-background text-foreground shadow-sm'"
        @click="emit('update:modelValue', option)"
      >
        {{ labelFor(option) }}
      </Button>
    </div>
    <Button
      variant="outline"
      size="icon"
      :aria-label="t('stats.actions.refresh')"
      :disabled="busy"
      @click="emit('refresh')"
    >
      <Spinner v-if="busy" size="xs" :label="t('stats.chargement')" />
      <Icon v-else name="ph:arrows-clockwise" size="18" aria-hidden="true" />
    </Button>
    <span v-if="mounted && updatedAt > 0" class="text-xs text-muted-foreground">
      {{ updatedLabel() }}
    </span>
  </div>
</template>
