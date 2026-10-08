<script setup lang="ts">
import type { CatalogueProposal } from "@/types/api/catalogue"
import { Badge } from "@/components/ui/badge"
import { formatDateCourte } from "@/utils/dates"

const { proposal } = defineProps<{
  proposal: CatalogueProposal
}>()

const { locale, t } = useI18n()
</script>

<template>
  <dl
    class="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3"
    data-testid="proposal-decision-card"
  >
    <div>
      <dt class="text-xs uppercase tracking-wide text-muted-foreground">
        {{ t("content.propositions.detail.decidedBy") }}
      </dt>
      <dd class="mt-1 text-foreground">
        {{ proposal.decidee_par ?? t("content.propositions.values.empty") }}
      </dd>
    </div>
    <div>
      <dt class="text-xs uppercase tracking-wide text-muted-foreground">
        {{ t("content.propositions.detail.decidedAt") }}
      </dt>
      <dd class="mt-1 text-foreground">
        {{
          proposal.decidee_le ? formatDateCourte(proposal.decidee_le, locale) : t("content.propositions.values.empty")
        }}
      </dd>
    </div>
    <div>
      <dt class="text-xs uppercase tracking-wide text-muted-foreground">
        {{ t("content.propositions.detail.status") }}
      </dt>
      <dd class="mt-1">
        <Badge
          data-testid="proposal-detail-status"
          :variant="proposal.statut === 'acceptee' ? 'success' : proposal.statut === 'refusee' ? 'warning' : 'default'"
        >
          {{ t(`content.propositions.status.${proposal.statut}`) }}
        </Badge>
      </dd>
    </div>
    <div v-if="proposal.motif" class="sm:col-span-2">
      <dt class="text-xs uppercase tracking-wide text-muted-foreground">
        {{ t("content.propositions.detail.reason") }}
      </dt>
      <dd class="mt-1 text-foreground">
        {{ proposal.motif }}
      </dd>
    </div>
  </dl>
</template>
