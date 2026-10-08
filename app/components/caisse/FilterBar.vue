<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { CaisseStatusFilter } from "@/stores/caisse-workspace"
import { PhListChecks, PhMagnifyingGlass, PhUser } from "@phosphor-icons/vue"
import { computed, h } from "vue"
import { Field, Operator } from "@/components/vuzeno/filters"
import FilterControls from "@/components/vuzeno/filters/FilterControls.vue"
import { useCaisseEncoursEntries } from "@/composables/useCaisseEncoursEntries"

const { hasActiveFilters } = defineProps<{
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{ clear: [] }>()

const filters = defineModel<Filter[]>("filters", { required: true })

const { t } = useI18n()
const { entries: encoursEntries } = useCaisseEncoursEntries()

/** Same porteurs the outstanding-cash strip shows — filtering to one is scoped to who currently
 *  has cash out, matching what the strip previously let you click straight to. */
const porteurOptions = computed(() =>
  encoursEntries.value.map(entry => ({ value: entry.porteurId, label: entry.name })),
)

/** `"attention"` isn't a backend status — it's the same `ouverte ∪ litige` definition
 *  `GET /caisses/encours` uses, offered here as one more filter value alongside the four
 *  real ones since filtering is entirely client-side (`filterCaisses`). */
const STATUS_OPTIONS: Exclude<CaisseStatusFilter, undefined>[] = [
  "attention",
  "ouverte",
  "comptee",
  "litige",
  "validee",
]

const fields = computed(() => [
  Field.TextField({
    key: "q",
    label: t("caisse.filterBar.searchLabel"),
    icon: () => h(PhMagnifyingGlass),
    operators: [Operator.Contain({ label: t("caisse.filterBar.searchOperatorContains"), default: true })],
  }),
  Field.TextField({
    key: "statut",
    label: t("caisse.filterBar.statusLabel"),
    icon: () => h(PhListChecks),
    operators: [
      Operator.Eq<string>({
        label: t("caisse.filterBar.statusOperatorIs"),
        default: true,
        inputType: "select",
        options: { items: STATUS_OPTIONS.map(status => ({ value: status, label: t(`caisse.status.${status}`) })) },
      }),
    ],
  }),
  Field.TextField({
    key: "porteur",
    label: t("caisse.filterBar.porteurLabel"),
    icon: () => h(PhUser),
    operators: [
      Operator.Eq<string>({
        label: t("caisse.filterBar.porteurOperatorIs"),
        default: true,
        inputType: "select",
        options: { items: porteurOptions.value, searchable: true },
      }),
    ],
  }),
])
</script>

<template>
  <FilterControls
    v-model:filters="filters"
    :fields="fields"
    test-id="caisse-filter-bar"
    clear-test-id="caisse-filter-clear"
    :has-active-filters="hasActiveFilters"
    :label="t('caisse.filterBar.clear')"
    @clear="emit('clear')"
  />
</template>
