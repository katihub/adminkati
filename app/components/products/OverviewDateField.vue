<script setup lang="ts">
import type { DateValue } from "@internationalized/date"
import { DateFormatter } from "@internationalized/date"
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateField, parseDateField } from "@/utils/date-field"

defineOptions({ inheritAttrs: false })

const { modelValue, disabled = false } = defineProps<{
  /** The day in the field's format (`2026-09-30`), or empty. */
  modelValue: string
  disabled?: boolean
}>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const { t, locale } = useI18n()
const open = ref(false)

const date = computed(() => parseDateField(modelValue))

/* UTC on both sides: the day shown is the field's day, never shifted by the browser's timezone. */
const label = computed(() =>
  date.value
    ? new DateFormatter(locale.value, { dateStyle: "long", timeZone: "UTC" }).format(date.value.toDate("UTC"))
    : t("products.overview.pickDate"),
)

function pick(next: DateValue | undefined) {
  emit("update:modelValue", formatDateField(next))
  open.value = false
}
</script>

<template>
  <div
    class="flex items-center rounded-lg bg-muted/70 px-3 py-1 transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2"
  >
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          v-bind="$attrs"
          type="button"
          variant="ghost"
          :disabled="disabled"
          class="h-auto min-w-0 flex-1 justify-between rounded-lg border-0 px-0 py-0 text-sm font-semibold text-foreground has-data-[icon=inline-end]:pr-0 hover:bg-transparent focus-visible:ring-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
        >
          <span :class="date ? undefined : 'font-normal text-muted-foreground'">{{ label }}</span>
          <Icon name="ph:calendar-dots" data-icon="inline-end" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar :model-value="date" :locale="locale" @update:model-value="pick" />
      </PopoverContent>
    </Popover>

    <Button
      v-if="date && !disabled"
      data-testid="date-clear"
      type="button"
      variant="ghost"
      size="icon-xs"
      class="rounded-lg border-0 hover:bg-background/70"
      :aria-label="t('products.overview.clearDate')"
      @click="emit('update:modelValue', '')"
    >
      <Icon name="ph:x" aria-hidden="true" />
    </Button>
  </div>
</template>
