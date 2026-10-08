<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import { PhListChecks, PhPlus, PhStorefront } from "@phosphor-icons/vue"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import FilterControls from "@/components/vuzeno/filters/FilterControls.vue"
import { searchFilterField, selectFilterField } from "@/utils/filter-fields"

const { canWrite, hasActiveFilters } = defineProps<{
  canWrite: boolean
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{
  clear: []
  add: []
}>()

const filters = defineModel<Filter[]>("filters", { required: true })

const { t } = useI18n()

const fields = computed(() => [
  searchFilterField(t("pointsOfSale.toolbar.searchLabel"), t("pointsOfSale.toolbar.searchOperator")),
  selectFilterField({
    key: "status",
    label: t("pointsOfSale.toolbar.statusLabel"),
    icon: PhStorefront,
    operatorLabel: t("pointsOfSale.toolbar.statusOperator"),
    items: [
      { label: t("pointsOfSale.status.active"), value: "active" },
      { label: t("pointsOfSale.status.inactive"), value: "inactive" },
    ],
  }),
  selectFilterField({
    key: "details",
    label: t("pointsOfSale.toolbar.detailsLabel"),
    icon: PhListChecks,
    operatorLabel: t("pointsOfSale.toolbar.detailsOperator"),
    items: [
      { label: t("pointsOfSale.toolbar.complete"), value: "complete" },
      { label: t("pointsOfSale.toolbar.missing"), value: "missing" },
    ],
  }),
])
</script>

<template>
  <section class="flex w-full flex-wrap items-center gap-3 py-4" data-testid="points-of-sale-toolbar">
    <FilterControls
      v-model:filters="filters"
      :fields="fields"
      class="gap-3"
      test-id="points-of-sale-filters"
      clear-test-id="points-of-sale-toolbar-clear"
      :has-active-filters="hasActiveFilters"
      :label="t('pointsOfSale.toolbar.clear')"
      @clear="emit('clear')"
    />
    <div v-if="canWrite" class="ml-auto flex items-center gap-3">
      <slot name="actions" />
      <Button size="sm" data-testid="points-of-sale-toolbar-add" @click="emit('add')">
        <PhPlus :size="16" aria-hidden="true" />
        {{ t("pointsOfSale.newPoint") }}
      </Button>
    </div>
  </section>
</template>
