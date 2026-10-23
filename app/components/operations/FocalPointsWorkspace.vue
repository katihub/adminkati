<script setup lang="ts">
import type { FocalPointShopFilters } from "@/types/api/points-focaux"
import { refDebounced } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { useFocalPointMembers, useFocalPointShops } from "@/composables/useFocalPoints"

/* WHO REPRESENTS KATIMARKET WHERE. The direction picks, shop by shop, the KATI
   focal point that handles its requests. A new shop arrives without one: the
   "Without a focal point" filter is the queue of shops to assign. The role
   itself is given on the Team page. */
const { t } = useI18n()
const search = ref("")
const debounced = refDebounced(search, 300)
/** "" = every shop, "sans" = unassigned ones, otherwise a member id. */
const scope = ref("sans")
const page = ref(1)
const members = useFocalPointMembers()
const filters = computed<FocalPointShopFilters>(() => ({
  ...(debounced.value.trim() ? { recherche: debounced.value.trim() } : {}),
  ...(scope.value ? { pointFocal: scope.value } : {}),
  page: page.value,
}))
const shops = useFocalPointShops(filters)

watch([debounced, scope], () => {
  page.value = 1
})
</script>

<template>
  <div
    class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:grid-cols-[280px_1fr] lg:px-10"
    data-testid="operations-focal-points-workspace"
  >
    <OperationsFocalPointsScope v-model="scope" :members="members.data.value" :pending="members.isPending.value" />

    <section class="space-y-3">
      <label class="relative block">
        <Icon
          name="ph:magnifying-glass"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="search"
          class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          :placeholder="t('operations.focal.points.search')"
          :aria-label="t('operations.focal.points.search')"
          data-testid="focal-shops-search"
        />
      </label>
      <div v-if="shops.isPending.value" class="h-40 animate-pulse rounded-lg bg-muted" />
      <ApiErrorCard v-else-if="shops.error.value" :error="shops.error.value" @retry="shops.refetch()" />
      <EmptyStateCard
        v-else-if="!shops.data.value?.elements.length"
        icon="ph:storefront"
        :text="t('operations.focal.points.emptyShops')"
      />
      <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
        <OperationsFocalShopAssignment
          v-for="shop in shops.data.value.elements"
          :key="shop.id"
          :shop="shop"
          :members="members.data.value ?? []"
        />
      </ul>
      <div v-if="(shops.data.value?.pages ?? 1) > 1" class="flex items-center justify-end gap-2 text-sm">
        <Button size="sm" variant="outline" :disabled="page <= 1" @click="page -= 1">{{
          t("operations.focal.previous")
        }}</Button>
        <span>{{ page }} / {{ shops.data.value?.pages }}</span>
        <Button size="sm" variant="outline" :disabled="page >= (shops.data.value?.pages ?? 1)" @click="page += 1">{{
          t("operations.focal.next")
        }}</Button>
      </div>
    </section>
  </div>
</template>
