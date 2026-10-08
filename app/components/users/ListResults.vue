<script setup lang="ts">
import type { CustomerDirectoryItem } from "@/types/api/clients"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

defineProps<{
  items: CustomerDirectoryItem[]
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
    <UsersListItem
      v-for="customer in items"
      :key="customer.id"
      :customer="customer"
      :selected="customer.id === selectedId"
      @select="emit('select', $event)"
    />
    <div v-if="isFetchingNextPage" class="flex flex-col gap-2 p-3">
      <Skeleton v-for="n in 3" :key="n" data-testid="users-list-skeleton" class="h-14 w-full shrink-0 rounded-2xl" />
    </div>
    <div v-if="hasNextPage && !isFetchingNextPage" class="p-3">
      <Button variant="outline" class="w-full" data-testid="users-load-more" @click="emit('loadMore')">
        {{ t("users.listPanel.loadMore") }}
      </Button>
    </div>
  </div>
</template>
