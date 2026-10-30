<script setup lang="ts">
import type { CommandeAnnuaireItem } from "@/types/api/commandes"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table } from "@/components/vuzeno/table"
import { useOrders } from "@/composables/useOrders"
import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"
import { ORDER_STATUS_TONE } from "@/utils/order-status"

const { clientId } = defineProps<{
  clientId: string
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const filters = computed(() => ({ clientId, tri: "recent" as const, taille: 50 }))
const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useOrders(filters)

const orders = computed(() => data.value?.pages.flatMap(page => page.elements) ?? [])

function amountFor(order: CommandeAnnuaireItem) {
  const value = order.totalFacturableTtc ?? order.totalFermeTtc ?? order.totalEstimeTtc
  return value === undefined ? null : formatMontant(value, locale.value)
}

function openOrder(reference: string) {
  void navigateTo(
    localePath({ name: "orders", query: { order: reference } }, route.path.startsWith("/fr/") ? "fr" : "en"),
  )
}
</script>

<template>
  <div data-testid="users-orders-tab" class="rounded-3xl bg-card p-4 sm:p-6">
    <div v-if="isPending && orders.length === 0" data-testid="users-orders-loading" class="flex flex-col gap-2">
      <Skeleton v-for="n in 4" :key="n" class="h-14 w-full rounded-2xl" />
    </div>

    <div v-else-if="error && orders.length === 0" class="flex justify-center p-6">
      <ApiErrorCard :error="error" @retry="refetch" />
    </div>

    <EmptyStateCard
      v-else-if="orders.length === 0"
      data-testid="users-orders-empty"
      icon="ph:receipt"
      :text="t('users.orders.emptyTitle')"
      :hint="t('users.orders.emptyHint')"
    />

    <template v-else>
      <p data-testid="users-orders-count" class="mb-3 text-sm text-muted-foreground">
        {{ t("users.orders.itemCount", { count: orders.length }) }}
      </p>

      <div data-testid="users-orders-list">
        <Table.Root class="text-left">
          <Table.Header>
            <Table.Row>
              <Table.Head scope="col">
                {{ t("users.orders.columns.reference") }}
              </Table.Head>
              <Table.Head scope="col">
                {{ t("users.orders.columns.status") }}
              </Table.Head>
              <Table.Head scope="col">
                {{ t("users.orders.columns.date") }}
              </Table.Head>
              <Table.Head scope="col" class="justify-end text-right">
                {{ t("users.orders.columns.items") }}
              </Table.Head>
              <Table.Head scope="col" class="justify-end text-right">
                {{ t("users.orders.columns.amount") }}
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row
              v-for="order in orders"
              :key="order.id"
              data-testid="users-orders-link"
              class="cursor-pointer"
              tabindex="0"
              @keydown.enter="openOrder(order.reference)"
              @click="openOrder(order.reference)"
            >
              <Table.Cell class="rounded-l-lg py-3 font-medium text-foreground">
                {{ order.reference }}
              </Table.Cell>
              <Table.Cell class="py-3">
                <Badge
                  :data-status="order.statut"
                  class="rounded-full border-0! px-2 py-0 text-[10px] font-medium"
                  :class="ORDER_STATUS_TONE[order.statut]"
                >
                  {{ t(`orders.status.${order.statut}`) }}
                </Badge>
              </Table.Cell>
              <Table.Cell class="py-3 text-muted-foreground">
                {{ formatDateCourte(order.creeLe, locale) }}
              </Table.Cell>
              <Table.Cell class="py-3 text-right text-muted-foreground">
                {{ order.ligneCount }}
              </Table.Cell>
              <Table.Cell class="rounded-r-lg py-3 text-right font-medium text-foreground">
                {{ amountFor(order)?.affiche ?? "—" }}
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </div>

      <InfiniteListFooter
        :has-next-page="hasNextPage"
        :is-fetching-next-page="isFetchingNextPage"
        :error="error"
        :loading-label="t('users.orders.loadingMore')"
        :failed-label="t('users.orders.loadFailed')"
        sentinel-test-id="users-orders-sentinel"
        failed-test-id="users-orders-load-failed"
        @load-more="fetchNextPage"
      />
    </template>
  </div>
</template>
