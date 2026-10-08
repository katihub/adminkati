<script setup lang="ts">
import type { ProduitsFilters } from "@/composables/useProduits"
import type { ProductQuickFilter } from "@/types/product-list"
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useProduits } from "@/composables/useProduits"

const { filters, selectedId = null } = defineProps<{
  filters: ProduitsFilters
  selectedId?: number | null
}>()

const emit = defineEmits<{
  select: [id: number]
  "update:filters": [filters: ProduitsFilters]
}>()

const { t } = useI18n()

const activeStatusFilter = computed<ProductQuickFilter>(() => {
  if (filters.etat === "retires") return "retire"
  if (filters.stock === "en-stock") return "en-stock"
  if (filters.stock === "rupture") return "rupture"
  if (filters.stock === "reapprovisionnement") return "reapprovisionnement"
  return "tous"
})

/**
 * The five pills partition the catalogue the same way each row's badge does (`deriveProductStatus`):
 * withdrawal overrides stock. Without `etat: "actifs"` the store's default `etat: "tous"` rode
 * along, so "In stock" and "Out of stock" also listed withdrawn products badged "Withdrawn" and
 * their counts overlapped the "Withdrawn" pill's (3 withdrawn products made the pills add up to
 * 4 308 for a 4 305-product catalogue).
 */
const quickFilterValues = {
  tous: {},
  "en-stock": { stock: "en-stock", etat: "actifs" },
  rupture: { stock: "rupture", etat: "actifs" },
  reapprovisionnement: { stock: "reapprovisionnement", etat: "actifs" },
  retire: { etat: "retires" },
} satisfies Record<ProductQuickFilter, Partial<Pick<ProduitsFilters, "stock" | "etat">>>

function setQuickFilter(type: ProductQuickFilter) {
  const next: ProduitsFilters = { ...filters }
  delete next.stock
  delete next.etat
  Object.assign(next, quickFilterValues[type])
  emit("update:filters", next)
}

/** `toRaw` unwraps the reactive prop: `ProduitsFilters` holds only primitives, so a shallow
 *  plain object passes to the query key cleanly without triggering deep watchers. */
const activeFilters = computed<ProduitsFilters>(() => ({ ...toRaw(filters) }))

const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useProduits(activeFilters)

/** InfiniteQuery: flatten pages into one array. */
const products = computed(() => data.value?.pages.flatMap(page => page.produits) ?? [])
const totalCount = computed(() => data.value?.pages[0]?.total ?? products.value.length)
/** Error and empty look identical here — the list panel is too narrow for a distinct error
 *  message with its own retry action; that lives in the detail panel instead. */
const showNotice = computed(() => !isPending.value && (Boolean(error.value) || products.value.length === 0))

const SCROLL_NEAR_BOTTOM_PX = 200
const scrollAreaRef = ref<InstanceType<typeof ScrollArea>>()
let viewportEl: HTMLElement | null = null

function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - SCROLL_NEAR_BOTTOM_PX
  if (nearBottom && hasNextPage.value && !isFetchingNextPage.value) fetchNextPage()
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

/** Reset viewport scroll to top when filters change. */
watch(activeFilters, () => {
  if (viewportEl) viewportEl.scrollTop = 0
})
</script>

<template>
  <div class="flex h-full flex-col gap-3.5">
    <ProductsListQuickFilters :active-filter="activeStatusFilter" :total-count="totalCount" @select="setQuickFilter" />

    <!-- Scrollable Products List -->
    <ScrollArea ref="scrollAreaRef" data-testid="products-list-scroll-area" class="flex-1 min-h-0 p-0!">
      <!-- Loading skeleton -->
      <div v-if="isPending" class="flex p-3 flex-col gap-2">
        <Skeleton
          v-for="n in 9"
          :key="n"
          data-testid="products-list-skeleton"
          class="h-14 w-full shrink-0 rounded-2xl"
        />
      </div>

      <!-- Error or empty state -->
      <InlineStateNotice
        v-else-if="showNotice"
        data-testid="products-list-empty"
        icon="ph:tray"
        :text="t('products.listPanel.empty')"
      />

      <!-- Item rows -->
      <div v-else class="flex flex-col gap-1.5">
        <ProductsListItem
          v-for="product in products"
          :key="product.id"
          :product="product"
          :selected="product.id === selectedId"
          @select="emit('select', $event)"
        />

        <div v-if="isFetchingNextPage" class="flex p-3 flex-col gap-2">
          <Skeleton
            v-for="n in 6"
            :key="n"
            data-testid="products-list-skeleton"
            class="h-14 w-full shrink-0 rounded-2xl"
          />
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
