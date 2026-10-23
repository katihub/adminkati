<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { useMyFocalShops } from "@/composables/useFocalPoints"

/* THE KATI FOCAL POINT'S DESK. The shops the direction assigned to it, and for
   each one its orders with the customers' contact details. Every other tab it
   sees (onboarding, moderation, disputes, quotes, reviews, agents) is already
   narrowed to these shops by the backend. */
const { t } = useI18n()
const shops = useMyFocalShops()
const selectedId = ref<string | null>(null)
const selected = computed(() => shops.data.value?.find(shop => shop.id === selectedId.value) ?? null)

watch(
  () => shops.data.value,
  list => {
    if (!selectedId.value && list?.length) selectedId.value = list[0]!.id
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:grid-cols-[320px_1fr] lg:px-10"
    data-testid="operations-focal-shops-workspace"
  >
    <section class="space-y-3">
      <div>
        <h2 class="font-heading text-base font-semibold">{{ t("operations.focal.shops.title") }}</h2>
        <p class="mt-1 text-xs text-muted-foreground">{{ t("operations.focal.shops.help") }}</p>
      </div>
      <div v-if="shops.isPending.value" class="space-y-2">
        <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="shops.error.value" :error="shops.error.value" @retry="shops.refetch()" />
      <EmptyStateCard
        v-else-if="!shops.data.value?.length"
        icon="ph:storefront"
        :text="t('operations.focal.shops.empty')"
      />
      <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
        <li v-for="shop in shops.data.value" :key="shop.id">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/60"
            :class="selectedId === shop.id ? 'bg-muted' : ''"
            :data-testid="`focal-shop-${shop.id}`"
            @click="selectedId = shop.id"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium">{{ shop.nom }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{
                [shop.ville, shop.vendeur.nomLegal].filter(Boolean).join(" · ")
              }}</span>
            </span>
            <Badge variant="outline">{{ t(`operations.trust.shopStatus.${shop.statut}`) }}</Badge>
          </button>
        </li>
      </ul>
    </section>
    <OperationsFocalShopOrders v-if="selected" :shop-id="selected.id" />
  </div>
</template>
