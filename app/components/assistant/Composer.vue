<script setup lang="ts">
import type { DemandeAssistanceDetail, RepondreDemandeInput } from "@/types/api/assistant"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  FICHE_TITLE_MAX_LENGTH,
  FICHE_TITLE_MIN_LENGTH,
  ficheTitleFromQuestion,
  isFicheTitleValid,
  isReplyLengthValid,
  REPLY_MAX_LENGTH,
  REPLY_MIN_LENGTH,
} from "@/utils/assistant-requests"

const {
  demande,
  canSaveFiche = false,
  pending = false,
} = defineProps<{
  demande: DemandeAssistanceDetail
  canSaveFiche?: boolean
  pending?: boolean
}>()

const emit = defineEmits<{ submit: [input: RepondreDemandeInput] }>()

const { t } = useI18n()

const draft = ref("")
/** Off by default: a personal answer resurfacing to another customer is the failure to avoid. */
const saveAsFiche = ref(false)
const ficheTitle = ref("")
const ficheDomain = ref("")

watch(saveAsFiche, on => {
  if (on && !ficheTitle.value) ficheTitle.value = ficheTitleFromQuestion(demande.question)
})

const replyLength = computed(() => draft.value.trim().length)
const showTooShort = computed(() => replyLength.value > 0 && replyLength.value < REPLY_MIN_LENGTH)
const wantsFiche = computed(() => canSaveFiche && saveAsFiche.value)
const canSubmit = computed(
  () => !pending && isReplyLengthValid(draft.value) && (!wantsFiche.value || isFicheTitleValid(ficheTitle.value)),
)

function buildInput(): RepondreDemandeInput {
  const reponse = draft.value.trim()
  if (!wantsFiche.value) return { reponse }
  const domaine = ficheDomain.value.trim()
  return {
    reponse,
    enregistrerCommeFiche: true,
    fiche: { titre: ficheTitle.value.trim(), ...(domaine ? { domaine } : {}) },
  }
}

function submit() {
  if (canSubmit.value) emit("submit", buildInput())
}

function reset() {
  draft.value = ""
  saveAsFiche.value = false
  ficheTitle.value = ""
  ficheDomain.value = ""
}

defineExpose({ reset })
</script>

<template>
  <form
    class="sticky bottom-0 space-y-3 border-t border-border bg-background p-4 sm:p-5"
    data-testid="assistant-reply-form"
    novalidate
    @submit.prevent="submit"
  >
    <div
      v-if="canSaveFiche && saveAsFiche"
      class="grid gap-3 rounded-2xl bg-muted/60 p-4 sm:grid-cols-2"
      data-testid="assistant-reply-fiche"
    >
      <div class="space-y-1.5">
        <Label for="assistant-reply-fiche-title">{{ t("assistant.reply.ficheTitle") }}</Label>
        <Input
          id="assistant-reply-fiche-title"
          v-model="ficheTitle"
          data-testid="assistant-reply-fiche-title"
          :maxlength="FICHE_TITLE_MAX_LENGTH"
          :disabled="pending"
          :aria-invalid="!isFicheTitleValid(ficheTitle) || undefined"
        />
        <p class="text-xs text-muted-foreground">
          {{ t("assistant.reply.ficheTitleHint", { min: FICHE_TITLE_MIN_LENGTH, max: FICHE_TITLE_MAX_LENGTH }) }}
        </p>
      </div>
      <div class="space-y-1.5">
        <Label for="assistant-reply-fiche-domain">{{ t("assistant.reply.ficheDomain") }}</Label>
        <Input
          id="assistant-reply-fiche-domain"
          v-model="ficheDomain"
          data-testid="assistant-reply-fiche-domain"
          :placeholder="t('assistant.reply.ficheDomainPlaceholder')"
          :disabled="pending"
        />
      </div>
    </div>

    <div class="flex items-end gap-2 rounded-2xl border border-border bg-muted/40 p-2">
      <Label for="assistant-reply-text" class="sr-only">{{ t("assistant.reply.label") }}</Label>
      <Textarea
        id="assistant-reply-text"
        v-model="draft"
        data-testid="assistant-reply-text"
        class="min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        :maxlength="REPLY_MAX_LENGTH"
        :placeholder="t('assistant.reply.placeholder')"
        :disabled="pending"
        :aria-invalid="showTooShort || undefined"
      />
      <TooltipIconButton
        v-if="canSaveFiche"
        type="button"
        icon="ph:bookmark-simple"
        data-testid="assistant-reply-save-fiche"
        :label="t('assistant.reply.saveAsFiche')"
        :tooltip="t('assistant.reply.saveAsFicheHint')"
        :variant="saveAsFiche ? 'default' : 'secondary'"
        :aria-pressed="saveAsFiche"
        :disabled="pending"
        @click="saveAsFiche = !saveAsFiche"
      />
      <Button
        type="submit"
        size="icon-sm"
        data-testid="assistant-reply-send"
        :disabled="!canSubmit"
        :aria-busy="pending || undefined"
      >
        <Spinner v-if="pending" data-icon="inline-start" />
        <Icon v-else name="ph:paper-plane-right" size="16" aria-hidden="true" />
        <span class="sr-only">{{ t("assistant.reply.send") }}</span>
      </Button>
    </div>
    <div class="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
      <span :class="showTooShort && 'text-destructive'">
        {{ showTooShort ? t("assistant.reply.tooShort", { min: REPLY_MIN_LENGTH }) : t("assistant.reply.hint") }}
      </span>
      <span class="shrink-0 font-mono" data-testid="assistant-reply-counter">
        {{ t("assistant.reply.counter", { count: draft.length, max: REPLY_MAX_LENGTH }) }}
      </span>
    </div>
  </form>
</template>
