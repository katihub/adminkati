<script setup lang="ts">
import type { DemandeAssistanceResume } from "@/types/api/assistant"
import { Badge } from "@/components/ui/badge"
import { ASSISTANT_REQUEST_STATUS_TONE } from "@/utils/assistant-requests"
import { formatDateCourte } from "@/utils/dates"

const { request, selected = false } = defineProps<{
  request: DemandeAssistanceResume
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const { locale, t } = useI18n()
</script>

<template>
  <button
    type="button"
    data-testid="assistant-list-item"
    :data-request-id="request.id"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
    :class="
      selected
        ? 'border-l-4 border-l-primary bg-muted border-t border-b'
        : 'hover:bg-muted/50 hover:border-l-4 hover:border-l-muted'
    "
    @click="emit('select', request.id)"
  >
    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-sm font-medium text-foreground" data-testid="assistant-list-item-reference">
          {{ request.reference }}
        </span>
        <time class="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground" :datetime="request.creeLe">
          {{ formatDateCourte(request.creeLe, locale) }}
        </time>
      </div>
      <p class="line-clamp-2 text-xs text-muted-foreground" data-testid="assistant-list-item-question">
        {{ request.question }}
      </p>
      <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span class="min-w-0 truncate">{{ request.nom ?? t("assistant.list.anonymous") }}</span>
        <Badge
          class="shrink-0 rounded-full border-0! px-2 py-0 text-[10px] font-medium"
          :class="ASSISTANT_REQUEST_STATUS_TONE[request.statut]"
        >
          {{ t(`assistant.status.${request.statut}`) }}
        </Badge>
      </div>
    </div>
  </button>
</template>
