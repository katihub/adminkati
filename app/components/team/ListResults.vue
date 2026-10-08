<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

defineProps<{
  members: TeamMember[]
  selectedId: string | null
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
  <div class="flex flex-col gap-1.5">
    <TeamListItem
      v-for="member in members"
      :key="member.id"
      :member="member"
      :selected="member.id === selectedId"
      @select="emit('select', $event)"
    />
    <div v-if="isFetchingNextPage" class="flex flex-col gap-2 p-3">
      <Skeleton v-for="n in 3" :key="n" data-testid="team-list-skeleton" class="h-14 w-full shrink-0 rounded-2xl" />
    </div>
    <div v-if="hasNextPage && !isFetchingNextPage" class="p-3">
      <Button variant="outline" class="w-full" data-testid="team-load-more" @click="emit('loadMore')">
        {{ t("team.listPanel.loadMore") }}
      </Button>
    </div>
  </div>
</template>
