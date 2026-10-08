<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed } from "vue"
import { Loader } from "@/components/ui/ai-elements/loader"
import { Shimmer } from "@/components/ui/ai-elements/shimmer"
import { Button } from "@/components/ui/button"
import { useAiGenerationStore } from "@/stores/ai-generation"

const { t } = useI18n()
const store = useAiGenerationStore()
const { status, language, label, history } = storeToRefs(store)

const loading = computed(() => status.value === "loading")
const loadingText = computed(() =>
  t("products.aiCopy.popup.loading", {
    language: language.value ? t(`products.aiCopy.language.${language.value}`) : "",
  }),
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <div
        v-if="loading"
        data-testid="ai-generation-loading"
        role="status"
        class="flex flex-col gap-1 rounded-xl border border-dashed p-3 text-sm"
      >
        <span class="flex items-center gap-2">
          <Spinner size="sm" />
          <Shimmer as="span">{{ loadingText }}</Shimmer>
        </span>
        <span v-if="label" class="truncate text-xs text-muted-foreground">{{ label }}</span>
      </div>

      <ul v-if="history.length" aria-live="polite" aria-relevant="additions" class="flex flex-col">
        <AdminAiGenerationHistoryItem
          v-for="(entry, index) in history"
          :key="entry.id"
          :entry="entry"
          :newest="index === 0"
        />
      </ul>
      <p
        v-else-if="!loading"
        data-testid="ai-generation-history-empty"
        class="py-6 text-center text-sm text-muted-foreground"
      >
        {{ t("products.aiCopy.popup.history.empty") }}
      </p>
    </div>

    <footer v-if="history.length && !loading" class="flex justify-end border-t p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="ai-generation-history-clear"
        @click="store.clearHistory()"
      >
        {{ t("products.aiCopy.popup.history.clear") }}
      </Button>
    </footer>
  </div>
</template>
