<script setup lang="ts">
import { storeToRefs } from "pinia"
import { Button } from "@/components/ui/button"
import { useAiGenerationStore } from "@/stores/ai-generation"

const { t } = useI18n()
const store = useAiGenerationStore()
const { panelSection } = storeToRefs(store)
</script>

<template>
  <section data-testid="ai-generation-panel" class="flex h-[min(80dvh,calc(100dvh-6rem))] flex-col">
    <header class="flex items-center justify-between gap-3 border-b p-4">
      <h2 class="flex min-w-0 items-center gap-2 text-sm font-medium">
        <AiIcon class="size-5" />
        {{ t("products.aiCopy.popup.title") }}
      </h2>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-testid="ai-generation-panel-close"
        :aria-label="t('products.aiCopy.popup.close')"
        @click="store.setPanelOpen(false)"
      >
        <Icon name="ph:x" size="16" aria-hidden="true" />
      </Button>
    </header>

    <div class="flex min-h-0 flex-1">
      <AdminAiGenerationSidebar />
      <div class="flex min-w-0 flex-1 flex-col">
        <AdminAiGenerationSuggestions v-if="panelSection === 'suggestions'" />
        <AdminAiGenerationSettings v-else-if="panelSection === 'settings'" />
        <p
          v-else
          data-testid="ai-generation-empty-conversations"
          class="grid flex-1 place-items-center p-4 text-center text-sm text-muted-foreground"
        >
          {{ t("products.aiCopy.popup.sections.empty.conversations") }}
        </p>
      </div>
    </div>
  </section>
</template>
