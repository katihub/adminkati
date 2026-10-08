<script setup lang="ts">
import type { StatutDemandeAssistance } from "@/types/api/assistant"
import { ASSISTANT_REQUEST_STATUSES } from "@/utils/assistant-requests"

/**
 * The three status pills, with their counts.
 *
 * Extracted from `ListPanel` because the pills carried most of its template
 * complexity: one loop, two class ternaries and a conditional count, nested
 * inside a list that already has a loading, an empty and a paginated state.
 * `fallow audit` scored the combined template over the cognitive threshold,
 * and the pills are the part with no tie to the list itself.
 */
const { status, counts } = defineProps<{
  status: StatutDemandeAssistance
  /** Absent while the first page is still loading: the pills show without numbers. */
  counts: Record<StatutDemandeAssistance, number> | undefined
}>()

const emit = defineEmits<{ select: [status: StatutDemandeAssistance] }>()

const { t } = useI18n()

function pillClass(candidate: StatutDemandeAssistance) {
  return status === candidate
    ? "bg-primary font-semibold text-primary-foreground shadow-xs"
    : "bg-muted/60 text-muted-foreground hover:bg-muted"
}

function countClass(candidate: StatutDemandeAssistance) {
  return status === candidate ? "bg-primary-foreground text-primary" : "bg-background text-foreground"
}
</script>

<template>
  <div
    class="flex flex-wrap gap-1 border-b border-border p-3"
    role="group"
    :aria-label="t('assistant.list.statusFilter')"
    data-testid="assistant-status-pills"
  >
    <button
      v-for="candidate in ASSISTANT_REQUEST_STATUSES"
      :key="candidate"
      type="button"
      :data-testid="`assistant-status-${candidate}`"
      :aria-pressed="status === candidate"
      class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
      :class="pillClass(candidate)"
      @click="emit('select', candidate)"
    >
      <span>{{ t(`assistant.tabs.${candidate}`) }}</span>
      <span
        v-if="counts"
        :data-testid="`assistant-status-count-${candidate}`"
        class="rounded-full px-1.5 py-0.5 font-mono text-[10px]"
        :class="countClass(candidate)"
      >
        {{ counts[candidate] }}
      </span>
    </button>
  </div>
</template>
