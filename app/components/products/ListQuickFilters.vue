<script setup lang="ts">
import type { ProductQuickFilter } from "@/types/product-list"
import { computed, toRefs } from "vue"

const props = defineProps<{
  activeFilter: ProductQuickFilter
  totalCount: number
}>()
const emit = defineEmits<{ select: [filter: ProductQuickFilter] }>()
const { activeFilter, totalCount } = toRefs(props)

const { t } = useI18n()
const filters = computed(() => [
  { id: "tous" as const, label: t("products.quickFilters.all") },
  { id: "en-stock" as const, label: t("products.quickFilters.inStock") },
  { id: "rupture" as const, label: t("products.quickFilters.outOfStock") },
  { id: "reapprovisionnement" as const, label: t("products.quickFilters.restocking") },
  { id: "retire" as const, label: t("products.quickFilters.withdrawn") },
])
</script>

<template>
  <div class="flex items-center gap-1.5 overflow-x-auto px-4 py-3 pb-1">
    <button
      v-for="filter in filters"
      :key="filter.id"
      type="button"
      class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
      :class="
        activeFilter === filter.id
          ? 'bg-primary font-semibold text-primary-foreground shadow-xs'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
      "
      @click="emit('select', filter.id)"
    >
      <span>{{ filter.label }}</span>
      <span
        v-if="activeFilter === filter.id"
        class="rounded-full bg-primary-foreground px-1.5 py-0.5 font-mono text-[10px] text-primary"
      >
        {{ totalCount }}
      </span>
    </button>
  </div>
</template>
