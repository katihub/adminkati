<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import { PhListChecks, PhMagnifyingGlass, PhSortAscending, PhUsersThree } from "@phosphor-icons/vue"
import { computed, h } from "vue"
import { Field, Operator } from "@/components/vuzeno/filters"
import FilterControls from "@/components/vuzeno/filters/FilterControls.vue"

const props = defineProps<{
  resource: "users" | "team"
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{ clear: [] }>()
const filters = defineModel<Filter[]>("filters", { required: true })

const { t } = useI18n()
function searchField(namespace: "users" | "team") {
  return Field.TextField({
    key: "q",
    label: t(`${namespace}.filterBar.searchLabel`),
    icon: () => h(PhMagnifyingGlass),
    operators: [Operator.Contain({ label: t(`${namespace}.filterBar.searchOperatorContains`), default: true })],
  })
}

function selectField(
  key: string,
  label: string,
  operatorLabel: string,
  icon: typeof PhListChecks,
  items: { value: string; label: string }[],
) {
  return Field.TextField({
    key,
    label,
    icon: () => h(icon),
    operators: [
      Operator.Eq<string>({
        label: operatorLabel,
        default: true,
        inputType: "select",
        options: { items },
      }),
    ],
  })
}

const fields = computed(() => {
  if (props.resource === "users") {
    return [
      searchField("users"),
      selectField("statut", t("users.filterBar.statusLabel"), t("users.filterBar.statusOperatorIs"), PhListChecks, [
        { value: "actif", label: t("users.listItem.status.actif") },
        { value: "suspendu", label: t("users.listItem.status.suspendu") },
        { value: "supprime", label: t("users.listItem.status.supprime") },
      ]),
      selectField("tri", t("users.filterBar.sortLabel"), t("users.filterBar.sortOperatorIs"), PhSortAscending, [
        { value: "recent", label: t("users.filterBar.sortRecent") },
        { value: "nom", label: t("users.filterBar.sortName") },
      ]),
    ]
  }

  return [
    searchField("team"),
    selectField("role", t("team.filterBar.roleLabel"), t("team.filterBar.roleOperatorIs"), PhUsersThree, [
      { value: "direction", label: t("team.roles.direction") },
      { value: "comptoir", label: t("team.roles.comptoir") },
      { value: "preparation", label: t("team.roles.preparation") },
      { value: "livreur", label: t("team.roles.livreur") },
    ]),
    selectField("actif", t("team.filterBar.activityLabel"), t("team.filterBar.activityOperatorIs"), PhListChecks, [
      { value: "true", label: t("team.filterBar.active") },
      { value: "false", label: t("team.filterBar.inactive") },
    ]),
    selectField("tri", t("team.filterBar.sortLabel"), t("team.filterBar.sortOperatorIs"), PhSortAscending, [
      { value: "nom", label: t("team.filterBar.sortName") },
      { value: "recent", label: t("team.filterBar.sortRecent") },
    ]),
  ]
})
</script>

<template>
  <FilterControls
    v-model:filters="filters"
    :fields="fields"
    :test-id="`${props.resource}-filter-bar`"
    :clear-test-id="`${props.resource}-filter-clear`"
    :has-active-filters="props.hasActiveFilters"
    :label="t(`${props.resource}.filterBar.clear`)"
    @clear="emit('clear')"
  />
</template>
