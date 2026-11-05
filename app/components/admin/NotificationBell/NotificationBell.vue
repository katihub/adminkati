<script setup lang="ts">
import type { TeamNotification } from "@/utils/notifications"
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useOpenNotification } from "@/composables/useOpenNotification"
import {
  useTeamNotificationCount,
  useTeamNotificationMutations,
  useTeamNotifications,
} from "@/composables/useTeamNotifications"
import { unreadBadge } from "@/utils/notifications"

/** The bell of the panel header: the unread count, and the latest notifications one click away. */
const { t } = useI18n({ useScope: "local" })
const open = ref(false)
const count = useTeamNotificationCount()
const list = useTeamNotifications(8)
const { markAllRead } = useTeamNotificationMutations()
const openNotification = useOpenNotification()

const unread = computed(() => count.data.value?.nonLues ?? 0)
const latest = computed(() => list.data.value?.pages[0]?.elements ?? [])

async function choose(notification: TeamNotification) {
  open.value = false
  await openNotification(notification)
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative size-11 min-h-11 min-w-11"
        :aria-label="unread ? t('labelUnread', { count: unread }) : t('label')"
        data-testid="notification-bell"
      >
        <Icon name="ph:bell" class="size-6" aria-hidden="true" />
        <span
          v-if="unread"
          class="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white"
          data-testid="notification-badge"
          >{{ unreadBadge(unread) }}</span
        >
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-[min(24rem,calc(100vw-2rem))] p-0" data-testid="notification-panel">
      <div class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p class="text-sm font-semibold text-foreground">{{ t("title") }}</p>
        <Button
          v-if="unread"
          variant="link"
          size="sm"
          class="h-auto p-0"
          :disabled="markAllRead.isPending.value"
          data-testid="notification-mark-all"
          @click="markAllRead.mutate()"
          >{{ t("markAll") }}</Button
        >
      </div>
      <div class="max-h-[60vh] overflow-y-auto p-1.5">
        <p v-if="list.isPending.value" class="px-3 py-6 text-center text-sm text-muted-foreground">
          {{ t("loading") }}
        </p>
        <p v-else-if="!latest.length" class="px-3 py-6 text-center text-sm text-muted-foreground">
          {{ t("empty") }}
        </p>
        <AdminNotificationItem
          v-for="notification in latest"
          :key="notification.id"
          :notification="notification"
          @open="choose"
        />
      </div>
      <div class="border-t border-border p-1.5">
        <NuxtLinkLocale
          to="/notifications"
          class="block rounded-lg px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-muted"
          data-testid="notification-see-all"
          @click="open = false"
          >{{ t("seeAll") }}</NuxtLinkLocale
        >
      </div>
    </PopoverContent>
  </Popover>
</template>

<i18n lang="json">
{
  "en": {
    "label": "Notifications",
    "labelUnread": "Notifications, {count} unread",
    "title": "Notifications",
    "markAll": "Mark all as read",
    "loading": "Loading…",
    "empty": "No notification yet.",
    "seeAll": "See all notifications"
  },
  "fr": {
    "label": "Notifications",
    "labelUnread": "Notifications, {count} non lues",
    "title": "Notifications",
    "markAll": "Tout marquer comme lu",
    "loading": "Chargement…",
    "empty": "Aucune notification pour l’instant.",
    "seeAll": "Voir toutes les notifications"
  }
}
</i18n>
