<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

const props = withDefaults(
  defineProps<{
    loading?: boolean
    error?: unknown
    empty?: boolean
    filtered?: boolean
    canWrite?: boolean
    emptyTitle: string
    filteredTitle?: string
    addLabel?: string
    clearLabel?: string
    emptyIcon: string
    filteredIcon?: string
  }>(),
  {
    loading: false,
    error: undefined,
    empty: false,
    filtered: false,
    canWrite: false,
  },
)

const emit = defineEmits<{
  retry: []
  clear: []
  add: []
}>()
</script>

<template>
  <section class="px-6 py-4" data-testid="taxonomy-flat-table-state">
    <div v-if="props.loading" class="space-y-2" data-testid="taxonomy-flat-table-loading">
      <Skeleton v-for="index in 5" :key="index" class="h-12 w-full rounded-xl" />
    </div>
    <ApiErrorCard v-else-if="props.error" :error="props.error" @retry="emit('retry')" />
    <Empty v-else-if="props.empty" class="min-h-72" data-testid="taxonomy-flat-table-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon :name="props.emptyIcon" size="24" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ props.emptyTitle }}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent v-if="props.canWrite">
        <Button size="sm" @click="emit('add')">
          {{ props.addLabel }}
        </Button>
      </EmptyContent>
    </Empty>
    <Empty v-else-if="props.filtered" class="min-h-72" data-testid="taxonomy-flat-table-no-results">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon :name="props.filteredIcon ?? props.emptyIcon" size="24" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ props.filteredTitle }}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" @click="emit('clear')">
          {{ props.clearLabel }}
        </Button>
      </EmptyContent>
    </Empty>
    <slot v-else />
  </section>
</template>
