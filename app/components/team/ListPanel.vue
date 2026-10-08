<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { ScrollArea } from "@/components/ui/scroll-area"

defineProps<{
  members: TeamMember[]
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
  <div class="flex h-full flex-col gap-3.5" data-testid="team-list-panel">
    <ScrollArea data-testid="team-list-scroll-area" class="flex-1 min-h-0 p-0!">
      <TeamListLoading v-if="isPending" />
      <InlineStateNotice
        v-else-if="error || members.length === 0"
        icon="ph:users-three"
        :text="t('team.listPanel.empty')"
      />
      <TeamListResults
        v-else
        :members="members"
        :selected-id="selectedId"
        :has-next-page="hasNextPage"
        :is-fetching-next-page="isFetchingNextPage"
        @select="emit('select', $event)"
        @load-more="emit('loadMore')"
      />
    </ScrollArea>
  </div>
</template>
