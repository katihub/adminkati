<script setup lang="ts">
import type { TeamNotification } from "@/utils/notifications"
import { relativeTime } from "@/utils/notifications"

/** One notification of the bell or of the history page; an unread one carries a dot and a bolder title. */
const { notification } = defineProps<{ notification: TeamNotification }>()
const emit = defineEmits<{ open: [notification: TeamNotification] }>()
const { locale } = useI18n()
</script>

<template>
  <button
    type="button"
    class="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
    :class="notification.lu ? '' : 'bg-primary/5'"
    data-testid="notification-item"
    :data-unread="notification.lu ? undefined : 'true'"
    @click="emit('open', notification)"
  >
    <span
      aria-hidden="true"
      class="mt-1.5 size-2 shrink-0 rounded-full"
      :class="notification.lu ? 'bg-transparent' : 'bg-primary'"
    />
    <span class="min-w-0 flex-1">
      <span class="block text-sm text-foreground" :class="notification.lu ? 'font-medium' : 'font-semibold'">{{
        notification.titre
      }}</span>
      <span class="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{{ notification.texte }}</span>
      <span class="mt-1 block text-[11px] text-muted-foreground">{{ relativeTime(notification.creeLe, locale) }}</span>
    </span>
  </button>
</template>
