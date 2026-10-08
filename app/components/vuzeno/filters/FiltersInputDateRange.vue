<script setup lang="ts">
import { type DateValue } from "@internationalized/date";
import { PhCalendarBlank, PhCaretLeft, PhCaretRight } from "@phosphor-icons/vue";
import { DatePicker } from "@/components/vuzeno/date-picker";
import { formatDateRangePreview, toCalendarDates, toDateRangeValue } from "@/utils/date-field";
import { cn } from "cnfast";
import { computed, shallowRef, watch } from "vue";
import { Button } from "../button";
import { injectFiltersContext } from "./context";
import type { DateField } from "./field";
import type { FilterRangeValue } from "./filter";
import { filtersControlVariants } from "./variants";

const value = defineModel<FilterRangeValue<DateValue> | null>();

const props = defineProps<{
  field: DateField;
}>();

defineOptions({
  inheritAttrs: false,
});

const { variant, size } = injectFiltersContext();
const { t } = useI18n();

const range = computed(() => toDateRangeValue([value.value?.start, value.value?.end]));
const draft = shallowRef<DateValue[]>([]);

watch(range, (next) => {
  draft.value = next ? [next.start, next.end] : [];
}, { immediate: true });

const pickerValue = computed<DateValue[]>({
  get() {
    return draft.value;
  },
  set(dates) {
    const nextDates = toCalendarDates(dates);
    draft.value = nextDates;
    const next = toDateRangeValue(nextDates);
    if (next)
      value.value = next;
  },
});

const label = computed(() => range.value ? formatDateRangePreview(range.value) : t("filters.selectDates"));
</script>

<template>
  <DatePicker.Root
    v-model="pickerValue"
    selection-mode="range"
    lazy-mount
    :min="props.field.min"
    :max="props.field.max"
  >
    <DatePicker.Trigger>
      <Button
        :variant="variant"
        :size="size"
        :class="
          cn(
            'w-auto min-w-0 justify-between gap-1.5 font-normal px-2 text-xs tabular-nums rounded-none border-l-0',
            filtersControlVariants({ size }),
            { 'text-muted-foreground': !value },
          )
        "
      >
        {{ label }}
        <PhCalendarBlank class="size-3!" />
      </Button>
    </DatePicker.Trigger>

    <DatePicker.Content class="min-w-0 p-3">
      <DatePicker.View view="day">
        <DatePicker.Context v-slot="{ api }">
          <DatePicker.ViewControl>
            <div class="flex items-center gap-2">
              <DatePicker.MonthSelect />
              <DatePicker.YearSelect />
            </div>
            <div>
              <DatePicker.PrevTrigger size="icon-xs">
                <PhCaretLeft />
              </DatePicker.PrevTrigger>
              <DatePicker.NextTrigger size="icon-xs">
                <PhCaretRight />
              </DatePicker.NextTrigger>
            </div>
          </DatePicker.ViewControl>
          <DatePicker.Table>
            <DatePicker.TableHead>
              <DatePicker.TableRow>
                <DatePicker.TableHeader
                  v-for="(weekDay, id) in api.weekDays"
                  :key="id"
                >
                  {{ weekDay.short }}
                </DatePicker.TableHeader>
              </DatePicker.TableRow>
            </DatePicker.TableHead>
            <DatePicker.TableBody>
              <DatePicker.TableRow v-for="(week, id) in api.weeks" :key="id">
                <DatePicker.TableCell
                  v-for="(day, dayId) in week"
                  :key="dayId"
                  :value="day"
                >
                  <DatePicker.TableCellTrigger>
                    {{ day.day }}
                  </DatePicker.TableCellTrigger>
                </DatePicker.TableCell>
              </DatePicker.TableRow>
            </DatePicker.TableBody>
          </DatePicker.Table>
        </DatePicker.Context>
      </DatePicker.View>
    </DatePicker.Content>
  </DatePicker.Root>
</template>
