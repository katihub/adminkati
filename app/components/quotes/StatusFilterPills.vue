<script setup lang="ts">
import type { StatutDevis } from "@/types/api/devis"
import { computed } from "vue"

const props = defineProps<{
  activeStatus?: StatutDevis
  totalCount?: number
}>()

const emit = defineEmits<{
  select: [status: StatutDevis | undefined]
}>()

const { t } = useI18n()
const statuses: readonly StatutDevis[] = ["ouvert", "commande", "archive"]
const activeStatus = computed(() => props.activeStatus)

function toggleStatus(status: StatutDevis) {
  emit("select", activeStatus.value === status ? undefined : status)
}
</script>

<template>
  <div data-testid="quotes-status-pills" class="flex items-center gap-1.5 overflow-x-auto px-4 py-3 pb-1">
    <button
      v-for="status in statuses"
      :key="status"
      type="button"
      data-testid="quotes-status-pill"
      :data-status="status"
      :aria-pressed="activeStatus === status"
      class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
      :class="
        activeStatus === status
          ? 'bg-primary font-semibold text-primary-foreground shadow-xs'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
      "
      @click="toggleStatus(status)"
    >
      <span>{{ t(`quotes.status.${status}`) }}</span>
      <span
        v-if="activeStatus === status && totalCount !== undefined"
        class="rounded-full bg-primary-foreground px-1.5 py-0.5 font-mono text-[10px] text-primary"
      >
        {{ totalCount }}
      </span>
    </button>
  </div>
</template>
