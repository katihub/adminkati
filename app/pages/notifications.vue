<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { useOpenNotification } from "@/composables/useOpenNotification"
import { useTeamNotificationMutations, useTeamNotifications } from "@/composables/useTeamNotifications"

/** The history of the bell: every notification of the member, newest first, a page at a time. */
definePageMeta({ layout: "admin", team: true })
defineI18nRoute({ paths: { en: "/notifications", fr: "/notifications" } })

const { t } = useI18n({ useScope: "local" })
useSeoMeta({ title: () => t("seoTitle"), robots: "noindex, nofollow" })

const list = useTeamNotifications(20)
const { markAllRead } = useTeamNotificationMutations()
const openNotification = useOpenNotification()

const notifications = computed(() => list.data.value?.pages.flatMap(page => page.elements) ?? [])
const unread = computed(() => list.data.value?.pages[0]?.nonLues ?? 0)
</script>

<template>
  <section class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6" data-testid="notifications-page">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-foreground">{{ t("heading") }}</h1>
        <p class="text-sm text-muted-foreground">{{ unread ? t("unread", { count: unread }) : t("allRead") }}</p>
      </div>
      <Button
        v-if="unread"
        variant="outline"
        :disabled="markAllRead.isPending.value"
        data-testid="notifications-mark-all"
        @click="markAllRead.mutate()"
        ><Icon name="ph:checks" /> {{ t("markAll") }}</Button
      >
    </div>

    <div class="rounded-2xl border border-border bg-card p-1.5">
      <p v-if="list.isPending.value" class="px-3 py-10 text-center text-sm text-muted-foreground">{{ t("loading") }}</p>
      <p v-else-if="list.isError.value" class="px-3 py-10 text-center text-sm text-destructive" role="alert">
        {{ t("error") }}
      </p>
      <p v-else-if="!notifications.length" class="px-3 py-10 text-center text-sm text-muted-foreground">
        {{ t("empty") }}
      </p>
      <AdminNotificationItem
        v-for="notification in notifications"
        :key="notification.id"
        :notification="notification"
        @open="openNotification"
      />
    </div>

    <Button
      v-if="list.hasNextPage.value"
      variant="outline"
      class="self-center"
      :disabled="list.isFetchingNextPage.value"
      data-testid="notifications-more"
      @click="list.fetchNextPage()"
      >{{ list.isFetchingNextPage.value ? t("loading") : t("more") }}</Button
    >
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "seoTitle": "Notifications · KatiMarket Admin",
    "heading": "Notifications",
    "unread": "{count} unread",
    "allRead": "Everything is read.",
    "markAll": "Mark all as read",
    "loading": "Loading…",
    "error": "The notifications could not be loaded. Try again in a moment.",
    "empty": "No notification yet.",
    "more": "Show older notifications"
  },
  "fr": {
    "seoTitle": "Notifications · Administration KatiMarket",
    "heading": "Notifications",
    "unread": "{count} non lues",
    "allRead": "Tout est lu.",
    "markAll": "Tout marquer comme lu",
    "loading": "Chargement…",
    "error": "Les notifications n’ont pas pu être chargées. Réessayez dans un instant.",
    "empty": "Aucune notification pour l’instant.",
    "more": "Voir les notifications plus anciennes"
  }
}
</i18n>
