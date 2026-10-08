<script setup lang="ts">
import type { CategoryTreeNode } from "@/utils/category-tree"
import CategoryTreeTableRow from "@/components/taxonomy/CategoryTreeTableRow.vue"
import { Table } from "@/components/vuzeno/table"

defineProps<{ nodes: CategoryTreeNode[]; expandedIds: Set<number>; matchingIds: Set<number> }>()
const emit = defineEmits<{ select: [category: CategoryTreeNode["category"]]; toggle: [id: number] }>()
</script>

<template>
  <Table.Body>
    <CategoryTreeTableRow
      v-for="node in nodes"
      :key="node.category.id"
      :node="node"
      :depth="0"
      :expanded-ids="expandedIds"
      :matching-ids="matchingIds"
      @select="emit('select', $event)"
      @toggle="emit('toggle', $event)"
    />
  </Table.Body>
</template>
