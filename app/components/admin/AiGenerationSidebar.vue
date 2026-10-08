<script setup lang="ts">
import type { AiPanelSection } from "@/types/ai/panel"
import { storeToRefs } from "pinia"
import { useAiGenerationStore } from "@/stores/ai-generation"
import { AI_PANEL_SECTIONS } from "@/types/ai/panel"

const SECTION_ICON: Record<AiPanelSection, string> = {
  suggestions: "ph:lightbulb",
  conversations: "ph:chats-circle",
  settings: "ph:gear",
}

const { t } = useI18n()
const store = useAiGenerationStore()
const { panelSection, unread } = storeToRefs(store)
</script>

<template>
  <nav :aria-label="t('products.aiCopy.popup.sections.label')" class="flex w-12 shrink-0 flex-col border-r p-2 sm:w-44">
    <ul class="flex flex-1 flex-col gap-1">
      <li
        v-for="section in AI_PANEL_SECTIONS"
        :key="section"
        :class="section === 'settings' && 'mt-auto border-t pt-2'"
      >
        <button
          type="button"
          :data-testid="`ai-generation-section-${section}`"
          :aria-current="panelSection === section ? 'true' : undefined"
          class="relative flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:bg-muted aria-[current=true]:text-foreground max-sm:justify-center max-sm:px-0"
          @click="store.setPanelSection(section)"
        >
          <Icon :name="SECTION_ICON[section]" size="18" class="shrink-0" aria-hidden="true" />
          <span class="max-sm:sr-only">{{ t(`products.aiCopy.popup.sections.${section}`) }}</span>
          <span
            v-if="section === 'suggestions' && unread"
            data-testid="ai-generation-unread-dot"
            aria-hidden="true"
            class="size-2 rounded-full bg-emerald-500 sm:ml-auto max-sm:absolute max-sm:top-1.5 max-sm:right-1.5"
          />
        </button>
      </li>
    </ul>
  </nav>
</template>
