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
  <div
    class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto"
    data-testid="stats-range-picker"
  >
    <div
      role="group"
      :aria-label="t('stats.actions.period')"
      class="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl bg-muted/60 p-1 sm:flex-wrap"
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
    <span v-if="mounted && updatedAt > 0" class="col-span-2 text-xs text-muted-foreground sm:col-span-1">
      {{ updatedLabel() }}
    </span>
  </div>
</template>
