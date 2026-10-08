<script setup lang="ts">
import type { CatalogueProposal, CatalogueProposalQuery } from "@/types/api/catalogue"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

const { proposals, selectedId, status, page, pageSize, total, isPending, error } = defineProps<{
  proposals: CatalogueProposal[]
  selectedId: number | null
  status: CatalogueProposalQuery["statut"]
  page: number
  pageSize: number
  total: number
  isPending: boolean
  error: unknown
}>()

const emit = defineEmits<{
  select: [id: number]
  status: [status: NonNullable<CatalogueProposalQuery["statut"]>]
  page: [page: number]
}>()

const { t } = useI18n()

const statuses = ["toutes", "en_attente", "acceptee", "refusee"] as const
const totalPages = computed(() => Math.max(1, Math.ceil(total / pageSize)))
/** Error and empty look identical here — the list panel is too narrow for a distinct error
 *  message with its own retry action; that lives in the detail panel instead. */
const showNotice = computed(() => !isPending && (Boolean(error) || proposals.length === 0))
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 py-3" data-testid="proposal-list-panel">
    <div class="flex flex-wrap gap-1 p-1" data-testid="proposal-status-pills">
      <Button
        v-for="candidate in statuses"
        :key="candidate"
        type="button"
        size="sm"
        :variant="status === candidate ? 'default' : 'ghost'"
        class="rounded-full text-xs"
        :data-testid="`proposal-status-${candidate}`"
        @click="emit('status', candidate)"
      >
        {{ t(`content.propositions.status.${candidate}`) }}
      </Button>
    </div>

    <!-- <p class="text-xs text-muted-foreground">
      {{ t("content.propositions.list.resultCount", { count: total }) }}
    </p> -->

    <ScrollArea class="min-h-0 flex-1" data-testid="proposal-list-scroll-area">
      <div v-if="isPending" class="space-y-2">
        <Skeleton v-for="n in 8" :key="n" data-testid="proposal-list-skeleton" class="h-20 rounded-xl" />
      </div>

      <InlineStateNotice
        v-else-if="showNotice"
        data-testid="proposal-list-empty"
        icon="ph:tray"
        :text="t('content.propositions.list.empty')"
      />

      <div v-else class="space-y-1.5">
        <ContentPropositionsProposalListItem
          v-for="proposal in proposals"
          :key="proposal.id"
          :proposal="proposal"
          :selected="proposal.id === selectedId"
          @select="emit('select', $event)"
        />
      </div>
    </ScrollArea>

    <div class="flex items-center justify-between gap-2 border-t border-border pt-3" data-testid="proposal-pagination">
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="page <= 1 || isPending"
        @click="emit('page', page - 1)"
      >
        {{ t("content.propositions.pagination.previous") }}
      </Button>
      <span class="text-xs text-muted-foreground">{{
        t("content.propositions.pagination.page", { page, total: totalPages })
      }}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="page >= totalPages || isPending"
        @click="emit('page', page + 1)"
      >
        {{ t("content.propositions.pagination.next") }}
      </Button>
    </div>
  </div>
</template>
