<script setup lang="ts">
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSellerConversationStatus, useSellerReply, useSellerThread } from "@/composables/useSellerMessaging"
import { apiErrorText } from "@/utils/api-error"
import { formatDateCourte } from "@/utils/dates"

/** One seller conversation: the thread, the team's reply signed with the member's name, and its status. */
const { id } = defineProps<{ id: string }>()
const { t, locale } = useI18n({ useScope: "local" })
const thread = useSellerThread(() => id)
const reply = useSellerReply()
const status = useSellerConversationStatus()
const text = ref("")
watch(
  () => id,
  () => {
    text.value = ""
  },
)
const resolved = computed(() => thread.data.value?.statut === "resolue")

async function send() {
  const contenu = text.value.trim()
  if (!contenu) return
  try {
    await reply.mutateAsync({ id, contenu })
    text.value = ""
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}

async function toggle() {
  const next = resolved.value ? "ouverte" : "resolue"
  try {
    await status.mutateAsync({ id, statut: next })
    toast.success(next === "ouverte" ? t("reopened") : t("markedResolved"))
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>

<template>
  <section class="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4" data-testid="seller-thread">
    <div v-if="thread.isPending.value" class="h-40 animate-pulse rounded-xl bg-muted" />
    <ApiErrorCard v-else-if="thread.error.value" :error="thread.error.value" @retry="thread.refetch()" />
    <template v-else-if="thread.data.value">
      <header class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="font-heading font-semibold">{{ thread.data.value.sujet }}</h3>
          <p class="text-xs text-muted-foreground">{{ thread.data.value.boutique.nom }}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          :disabled="status.isPending.value"
          data-testid="seller-thread-status"
          @click="toggle"
          >{{ resolved ? t("reopen") : t("resolve") }}</Button
        >
      </header>
      <ol class="flex flex-col gap-2" data-testid="seller-thread-messages">
        <li
          v-for="message in thread.data.value.messages"
          :key="message.id"
          class="max-w-[85%] rounded-xl px-3 py-2 text-sm"
          :class="message.auteurType === 'equipe' ? 'self-end bg-primary/10' : 'self-start bg-muted'"
        >
          <p class="text-xs font-semibold">{{ message.auteurNom }}</p>
          <p class="whitespace-pre-wrap">{{ message.contenu }}</p>
          <p class="text-right text-[0.7rem] text-muted-foreground">{{ formatDateCourte(message.creeLe, locale) }}</p>
        </li>
      </ol>
      <form class="flex flex-col gap-2" @submit.prevent="send">
        <Textarea
          v-model="text"
          rows="3"
          maxlength="4000"
          :placeholder="t('placeholder')"
          :aria-label="t('placeholder')"
          data-testid="seller-thread-reply"
        />
        <Button
          type="submit"
          class="self-end"
          :disabled="!text.trim() || reply.isPending.value"
          data-testid="seller-thread-send"
          >{{ t("send") }}</Button
        >
      </form>
    </template>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "resolve": "Mark resolved",
    "reopen": "Reopen",
    "markedResolved": "Conversation marked resolved.",
    "reopened": "Conversation reopened.",
    "placeholder": "Your reply to the shop",
    "send": "Send"
  },
  "fr": {
    "resolve": "Marquer résolue",
    "reopen": "Rouvrir",
    "markedResolved": "Conversation marquée résolue.",
    "reopened": "Conversation rouverte.",
    "placeholder": "Votre réponse à la boutique",
    "send": "Envoyer"
  }
}
</i18n>
