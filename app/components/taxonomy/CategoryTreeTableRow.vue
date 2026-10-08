<script setup lang="ts">
import type { CategoryTreeNode } from "@/utils/category-tree"
import { Badge } from "@/components/ui/badge"
import { Table } from "@/components/vuzeno/table"

const props = defineProps<{
  node: CategoryTreeNode
  depth: number
  expandedIds: Set<number>
  matchingIds: Set<number>
}>()

const emit = defineEmits<{ select: [category: CategoryTreeNode["category"]]; toggle: [id: number] }>()
const isExpanded = computed(() => props.expandedIds.has(props.node.category.id))
const isContext = computed(() => props.matchingIds.size > 0 && !props.matchingIds.has(props.node.category.id))
const { t } = useI18n()
</script>

<template>
  <Table.Row
    :data-testid="`category-row-${node.category.id}`"
    :data-context="isContext || undefined"
    class="cursor-pointer"
    @click="emit('select', node.category)"
  >
    <Table.Cell class="rounded-l-lg py-3">
      <div class="flex items-center gap-2" :style="{ paddingInlineStart: `${depth * 1.5}rem` }">
        <button
          v-if="node.children.length"
          type="button"
          class="size-6 rounded-md hover:bg-muted"
          :aria-expanded="isExpanded"
          :aria-label="
            isExpanded
              ? t('taxonomy.tree.collapse', { name: node.category.nom })
              : t('taxonomy.tree.expand', { name: node.category.nom })
          "
          @click.stop="emit('toggle', node.category.id)"
        >
          <Icon :name="isExpanded ? 'ph:caret-down' : 'ph:caret-right'" aria-hidden="true" />
        </button>
        <span v-else class="size-6" aria-hidden="true" />
        <span>{{ node.category.nom }}</span>
      </div>
    </Table.Cell>
    <Table.Cell class="py-3">
      {{ node.category.rayon ?? "—" }}
    </Table.Cell>
    <Table.Cell class="py-3">
      {{ node.category.compte_total }}
    </Table.Cell>
    <Table.Cell class="rounded-r-lg py-3">
      <Badge :variant="node.category.masquee ? 'outline' : 'secondary'" class="rounded-full px-2.5 py-0.5 text-xs">
        {{ node.category.masquee ? t("taxonomy.visibility.hidden") : t("taxonomy.visibility.visible") }}
      </Badge>
    </Table.Cell>
  </Table.Row>
  <template v-if="isExpanded">
    <CategoryTreeTableRow
      v-for="child in node.children"
      :key="child.category.id"
      :node="child"
      :depth="depth + 1"
      :expanded-ids="expandedIds"
      :matching-ids="matchingIds"
      @select="emit('select', $event)"
      @toggle="emit('toggle', $event)"
    />
  </template>
</template>
