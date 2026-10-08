<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

withDefaults(
  defineProps<{
    loading: boolean
    error?: unknown
    empty: boolean
    filtered: boolean
    canWrite: boolean
  }>(),
  {
    error: undefined,
  },
)

const emit = defineEmits<{ retry: []; clear: []; add: [] }>()
const { t } = useI18n()
</script>

<template>
  <section class="px-6 py-4" data-testid="category-tree-state">
    <div v-if="loading" class="flex flex-col gap-2" data-testid="category-tree-loading">
      <Skeleton v-for="index in 5" :key="index" class="h-12 w-full" />
    </div>
    <ApiErrorCard v-else-if="error" :error="error" data-testid="category-tree-error" @retry="emit('retry')" />
    <Empty v-else-if="empty" data-testid="category-tree-empty" class="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon name="ph:folder-simple" size="24" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ t("taxonomy.tree.empty") }}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent v-if="canWrite">
        <Button size="sm" @click="emit('add')">
          {{ t("taxonomy.toolbar.add") }}
        </Button>
      </EmptyContent>
    </Empty>
    <Empty v-else-if="filtered" data-testid="category-tree-no-results" class="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon name="ph:magnifying-glass" size="24" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ t("taxonomy.tree.noResults") }}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" variant="outline" @click="emit('clear')">
          {{ t("taxonomy.toolbar.clear") }}
        </Button>
      </EmptyContent>
    </Empty>
    <slot v-else />
  </section>
</template>
