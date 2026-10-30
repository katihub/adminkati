<script setup lang="ts">
// fallow-ignore-file complexity -- declarative admin workspace with mutually exclusive loading, empty and list states
import type { OutboundNotificationStatus } from "@/types/api/notifications"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import {
  useOutboundNotificationMutations,
  useOutboundNotifications,
  useOutboundNotificationsSummary,
} from "@/composables/useOutboundNotifications"
import { OUTBOUND_NOTIFICATION_STATUSES } from "@/types/api/notifications"

const STATUS_CLASSES: Record<OutboundNotificationStatus, string> = {
  en_attente: "bg-sky-100 text-sky-800",
  en_cours: "bg-indigo-100 text-indigo-800",
  envoyee: "bg-success/10 text-success",
  abandonnee: "bg-red-100 text-red-800",
}

const { t, locale } = useI18n()
const session = useCachedSession()
const canManage = computed(() => session.value?.roles.includes("direction") ?? false)
const status = ref<OutboundNotificationStatus | undefined>()
const page = ref(1)
watch(status, () => (page.value = 1))

const summary = useOutboundNotificationsSummary(canManage)
const list = useOutboundNotifications(
  computed(() => ({ statut: status.value, page: page.value, taille: 30 })),
  canManage,
)
const { retry, dispatch } = useOutboundNotificationMutations()
const dispatchOpen = ref(false)
const dispatchLocked = ref(false)
const retryLocked = ref(false)
if (import.meta.server && canManage.value)
  await Promise.all([summary.suspense(), list.suspense()].map(read => read.catch(() => undefined)))
function confirmDispatch() {
  if (!canManage.value || !dispatchOpen.value || dispatchLocked.value) return
  dispatchLocked.value = true
  dispatch.mutate(undefined, {
    onSettled: () => {
      dispatchLocked.value = false
      dispatchOpen.value = false
    },
  })
}
function retryNotification(id: string) {
  if (!canManage.value || retryLocked.value || dispatchLocked.value) return
  retryLocked.value = true
  retry.mutate(id, {
    onSettled: () => {
      retryLocked.value = false
    },
  })
}

const filters = computed(() => [
  { value: undefined, label: t("operations.notifications.filters.all") },
  ...OUTBOUND_NOTIFICATION_STATUSES.map(value => ({ value, label: t(`operations.notifications.status.${value}`) })),
])

const dispatchMessage = computed(() => {
  const report = dispatch.data.value
  if (!report) return null
  if (report.ignore === "fournisseur_absent") return t("operations.notifications.dispatch.noProvider")
  if (report.ignore === "deja_en_cours") return t("operations.notifications.dispatch.busy")
  return t("operations.notifications.dispatch.report", {
    sent: report.envoyees,
    retried: report.reprogrammees,
    abandoned: report.abandonnees,
  })
})

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString(locale.value, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Africa/Douala",
      })
    : "—"
}
</script>

<template>
  <EmptyStateCard v-if="!canManage" icon="ph:lock" :text="t('operations.notifications.restricted')" />
  <div
    v-else
    class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60"
    data-testid="operations-outbound-notifications-workspace"
  >
    <OperationsNotificationDispatchDialog
      :open="dispatchOpen"
      :pending="dispatchLocked"
      @update:open="dispatchOpen = $event"
      @confirm="confirmDispatch"
    />
    <div class="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <div class="max-w-3xl">
          <h2 class="font-heading text-xl font-semibold">{{ t("operations.notifications.title") }}</h2>
          <p class="mt-2 text-sm text-muted-foreground">{{ t("operations.notifications.explanation") }}</p>
          <p v-if="dispatchMessage" class="mt-2 text-sm font-medium" role="status">{{ dispatchMessage }}</p>
          <p v-if="dispatch.error.value" class="mt-2 text-sm text-destructive" role="alert">
            {{ t("operations.notifications.dispatch.error") }}
          </p>
        </div>
        <Button
          :disabled="dispatchLocked || retryLocked"
          data-testid="outbound-notifications-dispatch"
          @click="dispatchOpen = true"
          ><Icon name="ph:paper-plane-tilt" />{{ t("operations.notifications.dispatch.action") }}</Button
        >
      </div>
      <ApiErrorCard v-if="retry.error.value" :error="retry.error.value" @retry="retry.reset()" />

      <ApiErrorCard v-if="summary.error.value" :error="summary.error.value" @retry="() => void summary.refetch()" />
      <dl v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div
          v-for="value in OUTBOUND_NOTIFICATION_STATUSES"
          :key="value"
          class="rounded-xl border bg-card p-4 shadow-sm"
          :class="value === 'abandonnee' && (summary.data.value?.abandonnee ?? 0) > 0 ? 'border-red-300' : ''"
          :data-testid="`outbound-notifications-count-${value}`"
        >
          <dt class="text-xs text-muted-foreground">{{ t(`operations.notifications.status.${value}`) }}</dt>
          <dd class="mt-1 font-heading text-2xl font-semibold">{{ summary.data.value?.[value] ?? "—" }}</dd>
        </div>
        <div class="rounded-xl border bg-card p-4 shadow-sm">
          <dt class="text-xs text-muted-foreground">{{ t("operations.notifications.oldestWait") }}</dt>
          <dd class="mt-1 font-heading text-2xl font-semibold">
            {{ summary.data.value ? `${summary.data.value.attentePlusAncienneMinutes} min` : "—" }}
          </dd>
        </div>
      </dl>

      <div class="flex flex-wrap gap-2" role="group" :aria-label="t('operations.notifications.filters.label')">
        <button
          v-for="filter in filters"
          :key="filter.value ?? 'all'"
          type="button"
          class="min-h-9 rounded-full border px-3 text-sm"
          :class="status === filter.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'"
          :aria-pressed="status === filter.value"
          @click="status = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <ApiErrorCard v-if="list.error.value" :error="list.error.value" @retry="() => void list.refetch()" />
      <div v-else-if="list.isPending.value" class="h-40 animate-pulse rounded-xl bg-muted" />
      <EmptyStateCard
        v-else-if="!list.data.value?.elements.length"
        icon="ph:envelope-simple-open"
        :text="t('operations.notifications.empty')"
      />
      <ul v-else class="space-y-2" data-testid="outbound-notifications-list">
        <li
          v-for="item in list.data.value.elements"
          :key="item.id"
          class="grid gap-2 rounded-xl border bg-card p-4 text-sm shadow-sm md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="STATUS_CLASSES[item.statut]">
                {{ t(`operations.notifications.status.${item.statut}`) }}
              </span>
              <span class="font-mono text-xs text-muted-foreground">{{ item.evenement }}</span>
              <span class="text-xs text-muted-foreground">{{ formatDate(item.creeLe) }}</span>
            </div>
            <p class="mt-1 truncate font-medium">{{ item.sujet }}</p>
            <p class="truncate text-xs text-muted-foreground">
              {{ t(`operations.notifications.recipient.${item.destinataireType}`) }} · {{ item.destinataire }}
            </p>
            <p v-if="item.derniereErreur && item.statut !== 'envoyee'" class="mt-1 text-xs text-red-700">
              {{ t("operations.notifications.lastError", { attempts: item.tentatives, error: item.derniereErreur }) }}
            </p>
            <details class="mt-3 text-xs text-muted-foreground">
              <summary class="cursor-pointer font-medium">{{ t("operations.notifications.trace") }}</summary>
              <dl class="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt>{{ t("operations.notifications.identifier") }}</dt>
                  <dd class="break-all font-mono">{{ item.id }}</dd>
                </div>
                <div>
                  <dt>{{ t("operations.notifications.source") }}</dt>
                  <dd class="break-all">{{ item.objetType }} · {{ item.objetId }}</dd>
                </div>
                <div>
                  <dt>{{ t("operations.notifications.provider") }}</dt>
                  <dd>{{ item.fournisseur ?? "—" }}</dd>
                </div>
                <div>
                  <dt>{{ t("operations.notifications.attempts") }}</dt>
                  <dd>{{ item.tentatives }}</dd>
                </div>
              </dl>
            </details>
          </div>
          <div class="flex items-center gap-2 md:justify-end">
            <span v-if="item.statut === 'en_attente'" class="text-xs text-muted-foreground">
              {{ t("operations.notifications.nextAttempt", { date: formatDate(item.prochaineTentativeLe) }) }}
            </span>
            <span v-else-if="item.statut === 'envoyee'" class="text-xs text-muted-foreground">
              {{ t("operations.notifications.sentAt", { date: formatDate(item.envoyeeLe) }) }}
            </span>
            <Button
              v-if="item.statut === 'abandonnee'"
              size="sm"
              variant="outline"
              :disabled="retryLocked || dispatchLocked"
              :data-testid="`outbound-notification-retry-${item.id}`"
              @click="retryNotification(item.id)"
              ><Icon name="ph:arrow-clockwise" />{{ t("operations.notifications.retry") }}</Button
            >
          </div>
        </li>
      </ul>

      <div v-if="(list.data.value?.pages ?? 1) > 1" class="flex items-center justify-end gap-2 text-sm">
        <Button size="sm" variant="outline" :disabled="page <= 1 || list.isFetching.value" @click="page -= 1">{{
          t("operations.notifications.previous")
        }}</Button>
        <span>{{ t("operations.notifications.page", { page, pages: list.data.value?.pages ?? 1 }) }}</span>
        <Button
          size="sm"
          variant="outline"
          :disabled="page >= (list.data.value?.pages ?? 1) || list.isFetching.value"
          @click="page += 1"
          >{{ t("operations.notifications.next") }}</Button
        >
      </div>
    </div>
  </div>
</template>
