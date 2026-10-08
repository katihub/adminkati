<script setup lang="ts">
import type { DemandesAssistancePage, StatutDemandeAssistance } from "@/types/api/assistant"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

const { pageData, status, page, pageSize, selectedId, isPending, error } = defineProps<{
  pageData: DemandesAssistancePage | undefined
  status: StatutDemandeAssistance
  page: number
  pageSize: number
  selectedId: string | null
  isPending: boolean
  error: unknown
}>()

const emit = defineEmits<{
  select: [id: string]
  status: [status: StatutDemandeAssistance]
  page: [page: number]
}>()

const { t } = useI18n()

const requests = computed(() => pageData?.elements ?? [])
const totalPages = computed(() => Math.max(1, Math.ceil((pageData?.total ?? 0) / pageSize)))
/** Narrow column: a failed fetch and an empty queue share one notice. The detail panel owns retry. */
const showNotice = computed(() => !isPending && (Boolean(error) || requests.value.length === 0))
</script>

<template>
  <div class="flex h-full min-h-0 flex-col" data-testid="assistant-list-panel">
    <AssistantStatusPills :status="status" :counts="pageData?.compteurs" @select="emit('status', $event)" />

    <ScrollArea class="min-h-0 flex-1" data-testid="assistant-list-scroll-area">
      <div v-if="isPending" class="flex flex-col gap-2 p-3">
        <Skeleton v-for="n in 8" :key="n" data-testid="assistant-list-skeleton" class="h-16 w-full rounded-2xl" />
      </div>

      <InlineStateNotice
        v-else-if="showNotice"
        data-testid="assistant-list-empty"
        icon="ph:tray"
        :text="t('assistant.list.empty')"
      />

      <div v-else class="flex flex-col">
        <AssistantListItem
          v-for="request in requests"
          :key="request.id"
          :request="request"
          :selected="request.id === selectedId"
          @select="emit('select', $event)"
        />
      </div>
    </ScrollArea>

    <div
      v-if="totalPages > 1"
      class="flex items-center justify-between gap-2 border-t border-border p-3"
      data-testid="assistant-pagination"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="assistant-pagination-previous"
        :disabled="page <= 1 || isPending"
        @click="emit('page', page - 1)"
      >
        {{ t("assistant.pagination.previous") }}
      </Button>
      <span class="text-xs text-muted-foreground">{{
        t("assistant.pagination.page", { page, total: totalPages })
      }}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="assistant-pagination-next"
        :disabled="page >= totalPages || isPending"
        @click="emit('page', page + 1)"
      >
        {{ t("assistant.pagination.next") }}
      </Button>
    </div>
  </div>
</template>
