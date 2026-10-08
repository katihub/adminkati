<script setup lang="ts">
import type { AuteurMessageAssistance, DemandeAssistanceDetail } from "@/types/api/assistant"
import { computed } from "vue"
import { formatDateCourte } from "@/utils/dates"

const { demande } = defineProps<{
  demande: DemandeAssistanceDetail
}>()

const { locale, t } = useI18n()

/** The backend promises `rang` as the order; the array order is not part of the contract. */
const messages = computed(() => [...(demande.conversation?.messages ?? [])].sort((a, b) => a.rang - b.rang))

/* The visitor sits on the left, as the other party; the shop's two voices sit
   right, the team's darker than the assistant's so a human answer stands out. */
const BUBBLE_TONE: Record<AuteurMessageAssistance, string> = {
  visiteur: "self-start bg-muted text-foreground",
  assistant: "self-end bg-secondary text-secondary-foreground",
  equipe: "self-end bg-primary text-primary-foreground",
}

const answeredLine = computed(() => {
  const date = demande.reponduLe ? formatDateCourte(demande.reponduLe, locale.value) : ""
  if (demande.reponduPar) return t("assistant.detail.answeredBy", { name: demande.reponduPar.nom, date })
  return date ? t("assistant.detail.answeredAt", { date }) : ""
})
</script>

<template>
  <ol class="flex flex-col gap-3" data-testid="assistant-detail-conversation">
    <li class="flex justify-center">
      <span class="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
        {{ t("assistant.detail.received", { date: formatDateCourte(demande.creeLe, locale) }) }}
      </span>
    </li>

    <li class="flex max-w-[85%] items-end gap-2 self-start">
      <AssistantMessageAvatar kind="visiteur" :email="demande.courriel" />
      <div class="flex min-w-0 flex-col gap-1 rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground">
        <span class="text-[11px] font-semibold opacity-80">{{ t("assistant.detail.author.visiteur") }}</span>
        <p class="whitespace-pre-line" data-testid="assistant-detail-question">
          {{ demande.question }}
        </p>
      </div>
    </li>

    <li
      v-if="demande.conversation === null"
      class="flex items-center gap-2 self-center text-sm text-muted-foreground"
      data-testid="assistant-conversation-expired"
    >
      <Icon name="ph:clock-counter-clockwise" size="16" aria-hidden="true" class="shrink-0" />
      {{ t("assistant.detail.conversationExpired") }}
    </li>

    <li
      v-for="message in messages"
      :key="message.rang"
      class="flex max-w-[85%] items-end gap-2"
      :class="message.auteur === 'visiteur' ? 'self-start' : 'self-end flex-row-reverse'"
      data-testid="assistant-conversation-message"
      :data-author="message.auteur"
    >
      <AssistantMessageAvatar :kind="message.auteur" :email="message.auteur === 'visiteur' ? demande.courriel : null" />
      <div class="flex min-w-0 flex-col gap-1 rounded-2xl px-4 py-2.5 text-sm" :class="BUBBLE_TONE[message.auteur]">
        <span class="text-[11px] font-semibold opacity-80">
          {{ t(`assistant.detail.author.${message.auteur}`) }} ·
          <time :datetime="message.creeLe">{{ formatDateCourte(message.creeLe, locale) }}</time>
        </span>
        <p class="whitespace-pre-line">
          {{ message.texte }}
        </p>
      </div>
    </li>

    <template v-if="demande.reponse">
      <li class="flex justify-center">
        <span class="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {{ answeredLine }}
        </span>
      </li>
      <li class="flex max-w-[85%] items-end gap-2 self-end flex-row-reverse">
        <AssistantMessageAvatar kind="equipe" :name="demande.reponduPar?.nom" />
        <div
          class="flex min-w-0 flex-col gap-1 rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground outline outline-1 -outline-offset-1 outline-primary"
        >
          <span class="text-[11px] font-semibold opacity-80">{{ t("assistant.detail.answerTitle") }}</span>
          <p class="whitespace-pre-line" data-testid="assistant-detail-answer-text">
            {{ demande.reponse }}
          </p>
          <p
            v-if="demande.ficheCle"
            class="flex items-center gap-1.5 text-[11px] opacity-80"
            data-testid="assistant-detail-fiche"
          >
            <Icon name="ph:book-open-text" size="14" aria-hidden="true" />
            {{ t("assistant.detail.ficheSaved", { key: demande.ficheCle }) }}
          </p>
        </div>
      </li>
    </template>
  </ol>
</template>
