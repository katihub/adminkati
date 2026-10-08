<script setup lang="ts">
import type { CategoryTreeNode } from "@/utils/category-tree"

withDefaults(
  defineProps<{
    nodes: CategoryTreeNode[]
    nested?: boolean
  }>(),
  {
    nested: false,
  },
)
</script>

<template>
  <ul :role="nested ? 'group' : 'tree'" class="flex flex-col gap-2" data-testid="category-panel-subcategories">
    <li
      v-for="node in nodes"
      :key="node.category.id"
      role="treeitem"
      :aria-expanded="node.children.length ? true : undefined"
    >
      <div class="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon name="ph:folder-simple" size="15" aria-hidden="true" />
        </span>
        <p class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {{ node.category.nom }}
        </p>
        <Icon
          v-if="node.children.length"
          name="ph:caret-down"
          size="14"
          class="shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <CategorySubcategoryTree
        v-if="node.children.length"
        :nodes="node.children"
        nested
        class="mt-2 ml-3 rounded-xl bg-background/50 p-2"
      />
    </li>
  </ul>
</template>
