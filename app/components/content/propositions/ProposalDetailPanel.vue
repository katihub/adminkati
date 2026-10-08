<script setup lang="ts">
import type { CatalogueProposal } from "@/types/api/catalogue"

const { proposal, categories, canWrite, isAccepting, isRefusing, isLoading, error } = defineProps<{
  proposal: CatalogueProposal | null
  categories: ReadonlyMap<number, string>
  canWrite: boolean
  isAccepting: boolean
  isRefusing: boolean
  isLoading: boolean
  error: unknown
}>()

const emit = defineEmits<{
  accept: []
  refuse: [motif: string]
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="bg-background flex h-full min-h-0 flex-col overflow-hidden" data-testid="proposal-detail-panel">
    <div class="flex min-h-0 flex-1 flex-col bg-muted/30">
      <div
        v-if="isLoading"
        class="flex min-h-96 items-center justify-center text-sm text-muted-foreground"
        data-testid="proposal-detail-loading"
      >
        {{ t("content.propositions.detail.loading") }}
      </div>

      <div v-else-if="error" class="flex min-h-96 items-center justify-center" data-testid="proposal-detail-error">
        <ApiErrorCard :error="error" @retry="emit('retry')" />
      </div>

      <div v-else-if="!proposal" class="flex min-h-96 items-center justify-center" data-testid="proposal-detail-empty">
        <EmptyStateCard icon="ph:cursor-click" :text="t('content.propositions.detail.empty')" />
      </div>

      <template v-else>
        <ContentPropositionsProposalDetailHeader
          :proposal="proposal"
          :can-write="canWrite"
          :is-accepting="isAccepting"
          :is-refusing="isRefusing"
          @accept="emit('accept')"
          @refuse="emit('refuse', $event)"
        />

        <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" data-testid="proposal-detail-scroll">
          <div class="mx-auto max-w-4xl space-y-6">
            <div
              v-if="proposal.type === 'disparition'"
              class="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              data-testid="proposal-disappearance-callout"
            >
              {{ t("content.propositions.detail.disappearanceWarning") }}
            </div>
            <div
              v-else-if="proposal.type === 'creation'"
              class="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary"
              data-testid="proposal-creation-callout"
            >
              {{ t("content.propositions.detail.creationNotice") }}
            </div>

            <ContentPropositionsProposalChangesTable :proposal="proposal" :categories="categories" />

            <ContentPropositionsProposalDecisionCard :proposal="proposal" />
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
