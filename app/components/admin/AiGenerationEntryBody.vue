<script setup lang="ts">
import type { AiGenerationHistoryEntry } from "@/types/ai/product-copy"
import { Button } from "@/components/ui/button"
import { useAiGenerationStore } from "@/stores/ai-generation"

defineProps<{ entry: AiGenerationHistoryEntry; newest: boolean }>()

const { t } = useI18n()
const store = useAiGenerationStore()
</script>

<template>
  <div
    v-if="entry.status === 'ready'"
    class="flex flex-col gap-4 rounded-xl rounded-tl-sm border bg-card p-4 text-card-foreground"
  >
    <AdminAiGenerationSuggestionFields :suggestion="entry.suggestion" />
    <AdminAiGenerationWarnings :assets="entry.assets" :warnings="entry.warnings" />
    <div v-if="store.canRestore(entry.id)" class="flex flex-wrap justify-end gap-2 border-t pt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="ai-generation-history-review"
        @click="store.restore(entry.id)"
      >
        {{ t("products.aiCopy.popup.history.review") }}
        <Icon name="ph:arrow-right" size="14" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        size="sm"
        class="ai-gradient-button border-0 font-semibold text-black hover:brightness-95"
        data-testid="ai-generation-history-apply-all"
        @click="store.applyAll(entry.id)"
      >
        <Icon name="ph:checks" size="14" aria-hidden="true" />
        {{ t("products.aiCopy.popup.history.applyAll") }}
      </Button>
    </div>
  </div>
  <div v-else class="rounded-xl rounded-tl-sm border border-destructive/30 bg-destructive/5 p-4">
    <AdminAiGenerationFailureNotice :failure="entry.failure" :newest="newest" />
  </div>
</template>
