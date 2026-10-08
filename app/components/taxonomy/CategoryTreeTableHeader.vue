<script setup lang="ts">
import type { CategoryTreeSort } from "@/utils/category-tree"
import { Table } from "@/components/vuzeno/table"

const props = defineProps<{ sort: CategoryTreeSort }>()
const emit = defineEmits<{ sort: [key: CategoryTreeSort["key"]] }>()
const { t } = useI18n()

function ariaSort(key: CategoryTreeSort["key"]) {
  if (props.sort.key !== key) return "none"
  return props.sort.direction === "asc" ? "ascending" : "descending"
}
</script>

<template>
  <Table.Header>
    <Table.Row>
      <Table.Head scope="col">
        <button
          type="button"
          data-testid="category-sort-name"
          :aria-sort="ariaSort('nom')"
          @click="emit('sort', 'nom')"
        >
          {{ t("taxonomy.tree.name") }}
        </button>
      </Table.Head>
      <Table.Head scope="col">
        {{ t("taxonomy.tree.department") }}
      </Table.Head>
      <Table.Head scope="col">
        <button
          type="button"
          data-testid="category-sort-count"
          :aria-sort="ariaSort('compte_total')"
          @click="emit('sort', 'compte_total')"
        >
          {{ t("taxonomy.tree.products") }}
        </button>
      </Table.Head>
      <Table.Head scope="col">
        {{ t("taxonomy.tree.visibility") }}
      </Table.Head>
    </Table.Row>
  </Table.Header>
</template>
