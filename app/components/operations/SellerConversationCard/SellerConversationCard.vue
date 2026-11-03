<script setup lang="ts">
import type { SellerConversation } from "@/composables/useSellerMessaging"
import { formatDateCourte } from "@/utils/dates"

/** One conversation in the seller messages list: shop, subject, last activity, status and unread count. */
const { conversation, selected } = defineProps<{ conversation: SellerConversation; selected: boolean }>()
const emit = defineEmits<{ select: [id: string] }>()
const { t, locale } = useI18n({ useScope: "local" })
const statusLabel = computed(() => (conversation.statut === "resolue" ? t("resolved") : t("open")))
const lastActivity = computed(() => formatDateCourte(conversation.dernierMessageLe, locale.value))
</script>

<template>
  <button
    type="button"
    class="flex flex-col gap-1 rounded-xl border bg-card p-3 text-left text-sm transition-colors hover:border-primary"
    :class="selected ? 'border-primary' : 'border-border'"
    :data-testid="`seller-conversation-${conversation.id}`"
    @click="emit('select', conversation.id)"
  >
    <span class="flex items-center justify-between gap-2">
      <strong class="truncate">{{ conversation.boutique.nom }}</strong>
      <span
        v-if="conversation.nonLus"
        class="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground"
        :data-testid="`seller-conversation-unread-${conversation.id}`"
        >{{ conversation.nonLus }}</span
      >
    </span>
    <span class="truncate">{{ conversation.sujet }}</span>
    <span class="text-xs text-muted-foreground">{{ lastActivity }} · {{ statusLabel }}</span>
  </button>
</template>

<i18n lang="json">
{
  "en": { "open": "Open", "resolved": "Resolved" },
  "fr": { "open": "Ouverte", "resolved": "Résolue" }
}
</i18n>
