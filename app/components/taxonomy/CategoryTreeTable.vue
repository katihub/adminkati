<script setup lang="ts">
import type { CategoryTreeNode, CategoryTreeSort } from "@/utils/category-tree"
import CategoryTreeTableHeader from "@/components/taxonomy/CategoryTreeTableHeader.vue"
import CategoryTreeTableRows from "@/components/taxonomy/CategoryTreeTableRows.vue"
import CategoryTreeTableState from "@/components/taxonomy/CategoryTreeTableState.vue"
import { Table } from "@/components/vuzeno/table"

withDefaults(
  defineProps<{
    nodes: CategoryTreeNode[]
    expandedIds: Set<number>
    matchingIds?: Set<number>
    loading?: boolean
    error?: unknown
    empty?: boolean
    filtered?: boolean
    canWrite?: boolean
    sort?: CategoryTreeSort
  }>(),
  {
    matchingIds: () => new Set<number>(),
    loading: false,
    error: undefined,
    empty: false,
    filtered: false,
    canWrite: false,
    sort: () => ({ key: "nom", direction: "asc" }),
  },
)

const emit = defineEmits<{
  select: [category: CategoryTreeNode["category"]]
  toggle: [id: number]
  sort: [key: CategoryTreeSort["key"]]
  retry: []
  clear: []
  add: []
}>()
</script>

<template>
  <section data-testid="category-tree-table">
    <CategoryTreeTableState
      :loading="loading"
      :error="error"
      :empty="empty"
      :filtered="filtered && nodes.length === 0"
      :can-write="canWrite"
      @retry="emit('retry')"
      @clear="emit('clear')"
      @add="emit('add')"
    >
      <Table.Root class="text-left">
        <CategoryTreeTableHeader :sort="sort" @sort="emit('sort', $event)" />
        <CategoryTreeTableRows
          :nodes="nodes"
          :expanded-ids="expandedIds"
          :matching-ids="matchingIds"
          @select="emit('select', $event)"
          @toggle="emit('toggle', $event)"
        />
      </Table.Root>
    </CategoryTreeTableState>
  </section>
</template>
