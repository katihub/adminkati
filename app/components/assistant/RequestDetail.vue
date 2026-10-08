<script setup lang="ts">
import type { DemandeAssistanceDetail, RepondreDemandeInput } from "@/types/api/assistant"
import { ref } from "vue"
import { toast } from "vue-sonner"
import { useClotureDemande, useReponseDemande } from "@/composables/useReponseDemande"
import { apiErrorText } from "@/utils/api-error"

const { demande, canSaveFiche = false } = defineProps<{
  demande: DemandeAssistanceDetail
  canSaveFiche?: boolean
}>()

const emit = defineEmits<{ back: [] }>()

const { t } = useI18n()
const reply = useReponseDemande()
const close = useClotureDemande()
/**
 * Lives here, not in the form: a 409 refreshes the request to `close`, which
 * unmounts the form — and the backend's sentence explaining why must outlive it.
 */
const actionError = ref("")
const replyForm = ref<{ reset: () => void } | null>(null)

async function sendReply(input: RepondreDemandeInput) {
  actionError.value = ""
  try {
    await reply.mutateAsync({ id: demande.id, input })
    replyForm.value?.reset()
    toast.success(t(input.enregistrerCommeFiche ? "assistant.toast.repliedWithFiche" : "assistant.toast.replied"))
  } catch (error) {
    actionError.value = apiErrorText(error, t)
  }
}

async function closeRequest() {
  actionError.value = ""
  try {
    await close.mutateAsync(demande.id)
    toast.success(t("assistant.toast.closed"))
  } catch (error) {
    actionError.value = apiErrorText(error, t)
  }
}
</script>

<template>
  <article class="flex h-full min-h-0 flex-col" data-testid="assistant-detail-content">
    <AssistantDetailHeader
      :demande="demande"
      :pending="reply.isPending.value || close.isPending.value"
      @back="emit('back')"
      @close="() => void closeRequest()"
    />

    <div class="min-h-0 flex-1 overflow-y-auto bg-background">
      <div class="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        <AssistantThread :demande="demande" />

        <p
          v-if="actionError"
          role="alert"
          data-testid="assistant-action-error"
          class="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {{ actionError }}
        </p>
      </div>
    </div>

    <p
      v-if="demande.statut === 'close'"
      data-testid="assistant-closed-notice"
      class="border-t border-border bg-muted p-4 text-sm text-muted-foreground"
    >
      {{ t("assistant.reply.closedNotice") }}
    </p>
    <AssistantComposer
      v-else
      ref="replyForm"
      :demande="demande"
      :can-save-fiche="canSaveFiche"
      :pending="reply.isPending.value || close.isPending.value"
      @submit="input => void sendReply(input)"
    />
  </article>
</template>
