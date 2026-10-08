<script setup lang="ts">
import type { CatalogueProposal } from "@/types/api/catalogue"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { formatDateCourte } from "@/utils/dates"

const { proposal, selected } = defineProps<{
  proposal: CatalogueProposal
  selected: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
}>()

const { locale, t } = useI18n()
const changedFieldCount = computed(() => Object.keys(proposal.champs).length)
</script>

<template>
  <button
    type="button"
    data-testid="proposal-list-item"
    :data-proposal-id="proposal.id"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
    :class="
      selected
        ? 'border-l-4 border-l-primary bg-muted border-t border-b'
        : 'hover:bg-muted/50 hover:border-l-4 hover:border-l-muted'
    "
    @click="emit('select', proposal.id)"
  >
    <div class="min-w-0 flex-1 space-y-0.5">
      <div class="flex items-center justify-between gap-1.5">
        <span class="min-w-0 truncate text-sm font-semibold text-foreground">{{ proposal.nom }}</span>
        <Badge
          :variant="
            proposal.type === 'creation' ? 'success' : proposal.type === 'disparition' ? 'destructive' : 'outline'
          "
          class="shrink-0 text-[10px] uppercase tracking-wide"
        >
          {{ t(`content.propositions.type.${proposal.type}`) }}
        </Badge>
      </div>
      <p class="truncate text-xs text-muted-foreground">
        {{ proposal.slug }}
      </p>
      <div class="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span class="min-w-0 truncate">{{
          t("content.propositions.list.changedFields", { count: changedFieldCount })
        }}</span>
        <time class="shrink-0 whitespace-nowrap" :datetime="proposal.detectee_le">{{
          formatDateCourte(proposal.detectee_le, locale)
        }}</time>
      </div>
    </div>
  </button>
</template>
