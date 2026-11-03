<script setup lang="ts">
import type { SellerConversationStatus } from "@/composables/useSellerMessaging"
import { useSellerConversations } from "@/composables/useSellerMessaging"

/**
 * THE SELLER MESSAGES: direct conversations between a shop and the KATI team. The direction sees
 * every shop, a focal point only its own (the backend narrows the list). Unread counts come from
 * the team's last reading; opening a thread clears them.
 */
const { t } = useI18n({ useScope: "local" })
const status = ref<SellerConversationStatus | "">("ouverte")
const selectedId = ref<string | null>(null)
const conversations = useSellerConversations(status)
const tabs = computed(() => [
  { value: "ouverte", label: t("open"), testid: "seller-messages-open" },
  { value: "resolue", label: t("resolved"), testid: "seller-messages-resolved" },
  { value: "", label: t("all"), testid: "seller-messages-all" },
])
watch(status, () => {
  selectedId.value = null
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="seller-messages-workspace">
    <div class="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
      <PillTabs v-model="status" :items="tabs" />
    </div>
    <div
      class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:px-10"
    >
      <section class="flex min-w-0 flex-col gap-2" data-testid="seller-messages-list">
        <div v-if="conversations.isPending.value" class="space-y-2">
          <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
        <ApiErrorCard
          v-else-if="conversations.error.value"
          :error="conversations.error.value"
          @retry="conversations.refetch()"
        />
        <EmptyStateCard v-else-if="!conversations.data.value?.length" icon="ph:chats-circle" :text="t('empty')" />
        <template v-else>
          <OperationsSellerConversationCard
            v-for="conversation in conversations.data.value ?? []"
            :key="conversation.id"
            :conversation="conversation"
            :selected="conversation.id === selectedId"
            @select="selectedId = $event"
          />
        </template>
      </section>
      <OperationsSellerThread v-if="selectedId" :id="selectedId" />
      <EmptyStateCard v-else icon="ph:chat-text" :text="t('pick')" />
    </div>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "open": "Open",
    "resolved": "Resolved",
    "all": "All",
    "empty": "No conversation here.",
    "pick": "Choose a conversation to read it and reply."
  },
  "fr": {
    "open": "Ouvertes",
    "resolved": "Résolues",
    "all": "Toutes",
    "empty": "Aucune conversation ici.",
    "pick": "Choisissez une conversation pour la lire et répondre."
  }
}
</i18n>
