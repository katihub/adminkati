<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import { PhMagnifyingGlass, PhPlus, PhToggleRight } from "@phosphor-icons/vue"
import { computed, h } from "vue"
import { Button } from "@/components/ui/button"
import { Field, Operator } from "@/components/vuzeno/filters"
import FilterControls from "@/components/vuzeno/filters/FilterControls.vue"

const { canWrite, resultCount, hasActiveFilters } = defineProps<{
  canWrite: boolean
  resultCount: number
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{
  add: []
  clear: []
}>()

const filters = defineModel<Filter[]>("filters", { required: true })

const { t } = useI18n()

const fields = computed(() => [
  Field.TextField({
    key: "q",
    label: t("content.banners.filterBar.searchLabel"),
    icon: () => h(PhMagnifyingGlass),
    operators: [Operator.Contain({ label: t("content.banners.filterBar.searchOperatorContains"), default: true })],
  }),
  Field.TextField({
    key: "status",
    label: t("content.banners.filterBar.statusLabel"),
    icon: () => h(PhToggleRight),
    operators: [
      Operator.Eq({
        label: t("content.banners.filterBar.statusOperatorIs"),
        default: true,
        inputType: "select",
        options: {
          items: [
            { label: t("content.banners.status.active"), value: "active" },
            { label: t("content.banners.status.inactive"), value: "inactive" },
          ],
        },
      }),
    ],
  }),
])
</script>

<template>
  <div
    class="flex flex-col sticky top-16 z-20 gap-3 sm:flex-row sm:items-center sm:justify-between bg-background p-3"
    data-testid="banner-filter-bar"
  >
    <div class="flex flex-1 flex-wrap items-center gap-3">
      <FilterControls
        v-model:filters="filters"
        :fields="fields"
        class="flex-1"
        test-id="banner-filter-bar"
        clear-test-id="banner-filter-clear"
        :has-active-filters="hasActiveFilters"
        :label="t('content.banners.grid.clearFilters')"
        @clear="emit('clear')"
      />

      <p data-testid="banner-filter-result-count" class="shrink-0 text-sm text-muted-foreground">
        {{ t("content.banners.filterBar.resultCount", { count: resultCount }, resultCount) }}
      </p>
    </div>

    <Button
      v-if="canWrite"
      data-testid="banner-filter-add-button"
      class="ml-auto shrink-0 self-start bg-primary hover:bg-primary text-primary-foreground"
      @click="emit('add')"
    >
      <PhPlus :size="16" aria-hidden="true" />
      {{ t("content.banners.newBanner") }}
    </Button>
  </div>
</template>
