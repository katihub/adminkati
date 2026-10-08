<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { Comptoir } from "@/types/api/vitrine"
import { PhCalendarBlank, PhListChecks, PhMagnifyingGlass, PhSortAscending, PhStorefront } from "@phosphor-icons/vue"
import { computed, h } from "vue"
import { Field, Operator } from "@/components/vuzeno/filters"
import FilterControls from "@/components/vuzeno/filters/FilterControls.vue"

const { hasActiveFilters, comptoirs = [] } = defineProps<{
  hasActiveFilters: boolean
  /** The published counters. Empty for the roles the backend refuses that list to. */
  comptoirs?: Comptoir[]
}>()

const emit = defineEmits<{ clear: [] }>()

const filters = defineModel<Filter[]>("filters", { required: true })

const { t } = useI18n()

const SORT_OPTIONS = ["recent", "ancien", "montant-croissant", "montant-decroissant"] as const
const fields = computed(() => [
  Field.TextField({
    key: "q",
    label: t("orders.filterBar.searchLabel"),
    icon: () => h(PhMagnifyingGlass),
    operators: [Operator.Contain({ label: t("orders.filterBar.searchOperatorContains"), default: true })],
  }),
  Field.TextField({
    key: "statut",
    label: t("orders.filterBar.statusLabel"),
    icon: () => h(PhListChecks),
    operators: [
      Operator.Eq<string>({
        label: t("orders.filterBar.statusOperatorIs"),
        default: true,
        inputType: "select",
        options: {
          items: ORDER_STATUSES.map(status => ({ value: status as string, label: t(`orders.status.${status}`) })),
        },
      }),
    ],
  }),
  Field.DateField({
    key: "creeLe",
    label: t("orders.filterBar.dateLabel"),
    icon: () => h(PhCalendarBlank),
    operators: [Operator.Btw({ label: t("orders.filterBar.dateOperatorBetween"), default: true })],
  }),
  // LE COMPTOIR N'EST PAS UN CHOIX UNIQUE. Le backend accepte `comptoir` autant
  // de fois qu'on le répète ; l'écran offre donc des cases, pas une liste
  // déroulante qui obligerait à regarder un comptoir après l'autre.
  ...(comptoirs.length > 0
    ? [
        Field.TextField({
          key: "comptoir",
          label: t("orders.filterBar.counterLabel"),
          icon: () => h(PhStorefront),
          operators: [
            Operator.In<string>({
              label: t("orders.filterBar.counterOperatorIn"),
              default: true,
              options: { items: comptoirs.map(comptoir => ({ value: comptoir.cle, label: comptoir.libelle })) },
            }),
          ],
        }),
      ]
    : []),
  Field.TextField({
    key: "tri",
    label: t("orders.filterBar.sortLabel"),
    icon: () => h(PhSortAscending),
    operators: [
      Operator.Eq<string>({
        label: t("orders.filterBar.sortOperatorIs"),
        default: true,
        inputType: "select",
        options: {
          items: SORT_OPTIONS.map(option => ({ value: option, label: t(`orders.filterBar.sort.${option}`) })),
        },
      }),
    ],
  }),
])
</script>

<template>
  <FilterControls
    v-model:filters="filters"
    :fields="fields"
    test-id="orders-filter-bar"
    clear-test-id="orders-filter-clear"
    :has-active-filters="hasActiveFilters"
    :label="t('orders.filterBar.clear')"
    @clear="emit('clear')"
  />
</template>
