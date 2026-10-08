<script setup lang="ts">
import type { DemandeAssistanceDetail } from "@/types/api/assistant"

const {
  demande,
  selected,
  isPending,
  error,
  canSaveFiche = false,
} = defineProps<{
  demande: DemandeAssistanceDetail | undefined
  selected: boolean
  isPending: boolean
  error: unknown
  canSaveFiche?: boolean
}>()

const emit = defineEmits<{
  retry: []
  back: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col" data-testid="assistant-detail-panel">
    <div
      v-if="!selected"
      data-testid="assistant-detail-empty"
      class="flex h-full min-h-[20rem] items-center justify-center p-6"
    >
      <EmptyStateCard icon="ph:cursor-click" :text="t('assistant.page.empty')" />
    </div>
    <div
      v-else-if="error"
      class="flex h-full min-h-[20rem] items-center justify-center p-6 text-center"
      data-testid="assistant-detail-error"
    >
      <ApiErrorCard :error="error" @retry="emit('retry')" />
    </div>
    <div v-else-if="isPending" class="flex h-full min-h-[20rem] items-center justify-center p-6 text-center">
      <p data-testid="assistant-detail-loading" class="text-sm text-muted-foreground">
        {{ t("assistant.page.loading") }}
      </p>
    </div>
    <AssistantRequestDetail
      v-else-if="demande"
      :key="demande.id"
      class="min-h-0 flex-1"
      :demande="demande"
      :can-save-fiche="canSaveFiche"
      @back="emit('back')"
    />
  </div>
</template>
