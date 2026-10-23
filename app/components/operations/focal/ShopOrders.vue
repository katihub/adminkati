<script setup lang="ts">
import type { FocalShopOrder } from "@/types/api/points-focaux"
import { computed, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useFocalShopOrders } from "@/composables/useFocalPoints"
import { formatFrozenAddress } from "@/utils/frozen-address"

/* A SHOP'S ORDERS, WITH WHO ORDERED AND WHERE TO DELIVER. The focal point needs
   them to handle a dispute; it reads them, it never changes them. */
const props = defineProps<{ shopId: string }>()

const { t, locale } = useI18n()
const page = ref(1)
const orders = useFocalShopOrders(() => props.shopId, page)
const money = computed(() => new Intl.NumberFormat(locale.value))
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }))

watch(
  () => props.shopId,
  () => {
    page.value = 1
  },
)

const customer = (order: FocalShopOrder) =>
  order.commande.client.nom ?? order.commande.client.courriel ?? t("operations.common.unknownClient")
const phone = (order: FocalShopOrder) => order.commande.telephoneLivraison ?? order.commande.client.telephone
</script>

<template>
  <section class="space-y-3" data-testid="focal-shop-orders">
    <h3 class="font-heading text-base font-semibold">{{ t("operations.focal.orders.title") }}</h3>
    <div v-if="orders.isPending.value" class="h-32 animate-pulse rounded-lg bg-muted" />
    <ApiErrorCard v-else-if="orders.error.value" :error="orders.error.value" @retry="orders.refetch()" />
    <EmptyStateCard
      v-else-if="!orders.data.value?.elements.length"
      icon="ph:receipt"
      :text="t('operations.focal.orders.empty')"
    />
    <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
      <li
        v-for="order in orders.data.value.elements"
        :key="order.id"
        class="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]"
        :data-testid="`focal-order-${order.reference}`"
      >
        <span class="min-w-0">
          <span class="block font-medium">{{ order.reference }}</span>
          <span class="block truncate text-xs text-muted-foreground"
            >{{ date.format(new Date(order.creeLe)) }} ·
            {{ order.lignes.map(line => `${line.quantite} × ${line.produitNomCapture}`).join(", ") }}</span
          >
        </span>
        <span class="min-w-0">
          <span class="block truncate font-medium">{{ customer(order) }}</span>
          <span class="block truncate text-xs text-muted-foreground">{{
            [phone(order), order.commande.client.courriel].filter(Boolean).join(" · ")
          }}</span>
          <span class="block truncate text-xs text-muted-foreground">{{
            formatFrozenAddress(order.commande.adresseFigee)
          }}</span>
        </span>
        <span class="text-left md:text-right">
          <strong class="block">{{
            t("operations.focal.orders.amount", { amount: money.format(order.totalNetProduits) })
          }}</strong>
          <Badge variant="outline" class="mt-1">{{ order.statut }}</Badge>
        </span>
      </li>
    </ul>
    <div v-if="(orders.data.value?.pages ?? 1) > 1" class="flex items-center justify-end gap-2 text-sm">
      <Button size="sm" variant="outline" :disabled="page <= 1" @click="page -= 1">{{
        t("operations.focal.previous")
      }}</Button>
      <span>{{ page }} / {{ orders.data.value?.pages }}</span>
      <Button size="sm" variant="outline" :disabled="page >= (orders.data.value?.pages ?? 1)" @click="page += 1">{{
        t("operations.focal.next")
      }}</Button>
    </div>
  </section>
</template>
