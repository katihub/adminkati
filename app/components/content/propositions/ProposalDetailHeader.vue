<script setup lang="ts">
import type { CatalogueProposal } from "@/types/api/catalogue"
import { Badge } from "@/components/ui/badge"
import { formatDateCourte } from "@/utils/dates"

const { proposal, canWrite, isAccepting, isRefusing } = defineProps<{
  proposal: CatalogueProposal
  canWrite: boolean
  isAccepting: boolean
  isRefusing: boolean
}>()

const emit = defineEmits<{
  accept: []
  refuse: [motif: string]
}>()

const { locale, t } = useI18n()
</script>

<template>
  <header
    class="z-10 shrink-0 border-b border-border bg-background p-3 sm:px-6 lg:px-8"
    data-testid="proposal-detail-header"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="text-xs font-mono tracking-wide text-muted-foreground">
          {{ proposal.slug }}
        </p>
        <h2 class="mt-1 line-clamp-1 text-lg font-semibold text-foreground" data-testid="proposal-detail-name">
          {{ proposal.nom }}
        </h2>
      </div>
      <p class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name="ph:calendar-star-duotone" size="21" />
        {{ t("content.propositions.detail.detected", { date: formatDateCourte(proposal.detectee_le, locale) }) }}
      </p>
      <div class="flex flex-wrap items-center justify-end gap-3">
        <Badge
          data-testid="proposal-detail-type"
          :variant="
            proposal.type === 'creation' ? 'success' : proposal.type === 'disparition' ? 'destructive' : 'outline'
          "
        >
          {{ t(`content.propositions.type.${proposal.type}`) }}
        </Badge>
        <ContentPropositionsDecisionActions
          :proposal="proposal"
          :can-write="canWrite"
          :is-accepting="isAccepting"
          :is-refusing="isRefusing"
          @accept="emit('accept')"
          @refuse="emit('refuse', $event)"
        />
      </div>
    </div>
  </header>
</template>
