<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import { PhFolders, PhMagnifyingGlass, PhSortAscending, PhStorefront, PhTag } from "@phosphor-icons/vue"
import { computed, h } from "vue"
import { Field, Operator } from "@/components/vuzeno/filters"
import FilterControls from "@/components/vuzeno/filters/FilterControls.vue"
import { useTaxonomie } from "@/composables/useTaxonomie"

const { hasActiveFilters } = defineProps<{
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{ clear: [] }>()

const filters = defineModel<Filter[]>("filters", { required: true })

const SORT_OPTIONS = ["recent", "nom", "prix-croissant", "prix-decroissant"] as const
/** Mirrors `ListerProduitsDto.q`'s `@Length(1, 120)` in the backend. */
const SEARCH_MAX_LENGTH = 120

const { t } = useI18n()
const { data: taxonomie } = useTaxonomie()

const rayonOptions = computed(
  () =>
    taxonomie.value?.rayons.map(rayon => ({
      value: rayon.id,
      label: rayon.nom,
    })) ?? [],
)

const categoryOptions = computed(
  () =>
    taxonomie.value?.categories.map(categorie => ({
      value: String(categorie.id),
      label: categorie.nom,
    })) ?? [],
)

const brandOptions = computed(
  () =>
    taxonomie.value?.marques.map(marque => ({
      value: marque.nom,
      label: marque.nom,
    })) ?? [],
)

/** Search, category, and sort are always present; Department and Brand stay menu-added until
 *  selected. Each chip still derives from the product-list store in `products.vue`, so removing
 *  one resets its field and keeps every filter surface in sync. */
const fields = computed(() => [
  Field.TextField({
    key: "q",
    label: t("products.filterBar.searchLabel"),
    // The backend rejects `q` longer than 120 characters with a 400, which the list renders as
    // "no products". 49 product names are longer than that, so pasting one emptied the list;
    // capped here, the paste is truncated and still matches the name it came from.
    maxLength: SEARCH_MAX_LENGTH,
    icon: () => h(PhMagnifyingGlass),
    operators: [Operator.Contain({ label: t("products.filterBar.searchOperatorContains"), default: true })],
  }),
  Field.TextField({
    key: "rayon",
    label: t("products.filterBar.rayonLabel"),
    icon: () => h(PhStorefront),
    operators: [
      Operator.Eq({
        label: t("products.filterBar.rayonOperatorIs"),
        default: true,
        inputType: "select",
        options: { items: rayonOptions.value, searchable: true },
      }),
    ],
  }),
  Field.TextField({
    key: "categorie",
    label: t("products.filterBar.categoryLabel"),
    icon: () => h(PhFolders),
    operators: [
      Operator.Eq({
        label: t("products.filterBar.categoryOperatorIs"),
        default: true,
        inputType: "select",
        options: { items: categoryOptions.value, searchable: true },
      }),
    ],
  }),
  Field.TextField({
    key: "marque",
    label: t("products.filterBar.brandLabel"),
    icon: () => h(PhTag),
    operators: [
      Operator.Eq({
        label: t("products.filterBar.brandOperatorIs"),
        default: true,
        inputType: "select",
        options: { items: brandOptions.value, searchable: true },
      }),
    ],
  }),
  Field.TextField({
    key: "tri",
    label: t("products.filterBar.sortLabel"),
    icon: () => h(PhSortAscending),
    operators: [
      Operator.Eq<string>({
        label: t("products.filterBar.sortOperatorIs"),
        default: true,
        inputType: "select",
        options: {
          items: SORT_OPTIONS.map(option => ({
            value: option as string,
            label: t(`products.filterBar.sort.${option}`),
          })),
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
    test-id="products-filter-bar"
    clear-test-id="products-filter-clear"
    :has-active-filters="hasActiveFilters"
    :label="t('products.filterBar.clear')"
    @clear="emit('clear')"
  />
</template>
