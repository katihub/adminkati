<script setup lang="ts">
import type { CustomerActivity } from "@/types/api/customer-activity"
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"
import { formatDateCourte } from "@/utils/dates"

const { clientId } = defineProps<{ clientId: string }>()
const { t, locale } = useI18n()
const api = useApiFetch()
const query = useQuery<CustomerActivity>({
  queryKey: computed(() => ["v1", "clients", clientId, "activite"]),
  queryFn: () => api(`/clients/${encodeURIComponent(clientId)}/activite`),
})
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="customer-activity">
    <ApiErrorCard v-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <p v-else-if="query.isPending.value" class="p-4 text-sm text-muted-foreground">{{ t("users.page.loading") }}</p>
    <template v-else-if="query.data.value">
      <p class="text-xs text-muted-foreground">{{ t("users.activity.limit", { count: query.data.value.limite }) }}</p>
      <section class="rounded-2xl border border-border bg-card p-5">
        <h3 class="font-heading font-semibold">
          {{ t("users.activity.assistance", { count: query.data.value.assistance.total }) }}
        </h3>
        <p v-if="!query.data.value.assistance.elements.length" class="mt-3 text-sm text-muted-foreground">
          {{ t("users.activity.empty") }}
        </p>
        <ul v-else class="mt-3 divide-y divide-border">
          <li v-for="ticket in query.data.value.assistance.elements" :key="ticket.id" class="flex flex-col gap-2 py-3">
            <NuxtLinkLocale
              :to="{ path: '/operations', query: { tab: 'customer-requests', demande: ticket.id } }"
              class="font-semibold text-primary underline underline-offset-4"
              >{{ ticket.reference }}</NuxtLinkLocale
            >
            <p class="whitespace-pre-wrap text-sm">{{ ticket.question }}</p>
            <p class="text-xs text-muted-foreground">
              {{ ticket.statut }} · {{ formatDateCourte(ticket.creeLe, locale) }}
            </p>
          </li>
        </ul>
      </section>
      <section class="rounded-2xl border border-border bg-card p-5">
        <h3 class="font-heading font-semibold">
          {{ t("users.activity.cases", { count: query.data.value.dossiers.total }) }}
        </h3>
        <p v-if="!query.data.value.dossiers.elements.length" class="mt-3 text-sm text-muted-foreground">
          {{ t("users.activity.empty") }}
        </p>
        <ul v-else class="mt-3 divide-y divide-border">
          <UsersCaseRecord v-for="item in query.data.value.dossiers.elements" :key="item.id" :item="item" />
        </ul>
      </section>
    </template>
  </div>
</template>
