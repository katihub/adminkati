import type { TeamNotification } from "@/utils/notifications"
import { useTeamNotificationMutations } from "@/composables/useTeamNotifications"
import { notificationTarget } from "@/utils/notifications"

/** Opening a notification marks it read, then goes where it points (in the panel language). */
export function useOpenNotification() {
  const { markRead } = useTeamNotificationMutations()
  const localePath = useLocalePath()
  return async (notification: TeamNotification) => {
    if (!notification.lu) markRead.mutate(notification.id)
    const target = notificationTarget(notification.lien)
    if (target) await navigateTo({ path: localePath(target.path), query: target.query })
  }
}
