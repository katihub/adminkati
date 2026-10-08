<script setup lang="ts">
import type { CommandesFilters } from "@/composables/useOrders"
import type { OrderDateRange } from "@/utils/order-date-range"
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrders } from "@/composables/useOrders"
import { useComptoirs } from "@/composables/usePointsVente"
import { filterOrdersByDateRange } from "@/utils/order-date-range"

const {
  filters,
  selectedReference = null,
  dateRange,
} = defineProps<{
  filters: CommandesFilters
  selectedReference?: string | null
  dateRange?: OrderDateRange
}>()

const emit = defineEmits<{
  select: [reference: string]
  "update:filters": [filters: CommandesFilters]
}>()

const { t } = useI18n()
const { comptoirs } = useComptoirs()
const activeFilters = computed<CommandesFilters>(() => ({ ...toRaw(filters) }))

const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders(activeFilters)

const orders = computed(() =>
  filterOrdersByDateRange(data.value?.pages.flatMap(page => page.elements) ?? [], dateRange),
)
const _totalCount = computed(() => data.value?.pages[0]?.total ?? orders.value.length)
const showNotice = computed(() => !isPending.value && (Boolean(error.value) || orders.value.length === 0))

const scrollAreaRef = ref<InstanceType<typeof ScrollArea>>()
let viewportEl: HTMLElement | null = null

function _updateStatus(status: CommandesFilters["statut"]) {
  const next = { ...filters }
  if (status) next.statut = status
  else delete next.statut
  emit("update:filters", next)
}

function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 200
  if (nearBottom && hasNextPage.value && !isFetchingNextPage.value) void fetchNextPage()
}

onMounted(() => {
  viewportEl =
    (scrollAreaRef.value?.$el as HTMLElement | undefined)?.querySelector<HTMLElement>(
      "[data-slot='scroll-area-viewport']",
    ) ?? null
  viewportEl?.addEventListener("scroll", handleScroll)
})

onBeforeUnmount(() => {
  viewportEl?.removeEventListener("scroll", handleScroll)
})

watch(activeFilters, () => {
  if (viewportEl) viewportEl.scrollTop = 0
})
</script>

<template>
  <div class="flex h-full flex-col gap-3.5" data-testid="orders-list-panel">
    <!-- <OrdersStatusFilterPills
      :active-status="filters.statut"
      :total-count="totalCount"
      @select="updateStatus"
    /> -->

    <ScrollArea ref="scrollAreaRef" data-testid="orders-list-scroll-area" class="flex-1 min-h-0 p-0!">
      <div v-if="isPending" class="flex p-3 flex-col gap-2">
        <Skeleton v-for="n in 9" :key="n" data-testid="orders-list-skeleton" class="h-14 w-full shrink-0 rounded-2xl" />
      </div>

      <InlineStateNotice
        v-else-if="showNotice"
        data-testid="orders-list-empty"
        icon="ph:tray"
        :text="t('orders.listPanel.empty')"
      />

      <div v-else class="flex flex-col gap-1.5">
        <OrdersListItem
          v-for="order in orders"
          :key="order.id"
          :order="order"
          :comptoirs="comptoirs"
          :selected="order.reference === selectedReference"
          @select="emit('select', $event)"
        />

        <div v-if="isFetchingNextPage" class="flex p-3 flex-col gap-2">
          <Skeleton
            v-for="n in 6"
            :key="n"
            data-testid="orders-list-skeleton"
            class="h-14 w-full shrink-0 rounded-2xl"
          />
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
