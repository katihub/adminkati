<script setup lang="ts">
import type { CustomerDirectoryItem } from "@/types/api/clients"
import { ScrollArea } from "@/components/ui/scroll-area"

defineProps<{
  items: CustomerDirectoryItem[]
  selectedId: string | null
  isPending: boolean
  error: unknown
  hasNextPage: boolean
  isFetchingNextPage: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  loadMore: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex h-full flex-col gap-3.5" data-testid="users-list-panel">
    <ScrollArea data-testid="users-list-scroll-area" class="flex-1 min-h-0 p-0!">
      <UsersListLoading v-if="isPending" />
      <InlineStateNotice
        v-else-if="error || items.length === 0"
        icon="ph:users-three"
        :text="t('users.listPanel.empty')"
      />
      <UsersListResults
        v-else
        :items="items"
        :selected-id="selectedId"
        :has-next-page="hasNextPage"
        :is-fetching-next-page="isFetchingNextPage"
        @select="emit('select', $event)"
        @load-more="emit('loadMore')"
      />
    </ScrollArea>
  </div>
</template>
