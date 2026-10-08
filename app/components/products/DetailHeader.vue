<script setup lang="ts">
import type { ProductTab } from "@/types/product-tab"
import { computed, toRefs } from "vue"

const props = defineProps<{
  productName: string | undefined
  historyCount: number
  activeTab: ProductTab
  showStock: boolean
}>()
const emit = defineEmits<{ "update:activeTab": [value: ProductTab] }>()
const { productName, historyCount, activeTab, showStock } = toRefs(props)

const { t } = useI18n()

const tabs = computed(() => [
  { value: "overview", label: t("products.tabs.overview") },
  ...(showStock.value ? [{ value: "stock", label: t("products.tabs.stock") }] : []),
  { value: "history", label: t("products.tabs.history", { count: historyCount.value }) },
])
</script>

<template>
  <div class="border-b border-muted sticky bg-background z-20 top-0 p-3">
    <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 md:grid md:grid-cols-[1fr_auto_1fr]">
      <!-- `pl-9` keeps the title where the header's old `pl-12` put it; with the padding symmetric, equal side columns land the tabs dead centre. -->
      <h3 class="font-medium max-w-1/3 line-clamp-1 pl-9 md:max-w-none">
        {{ productName }}
      </h3>
      <PillTabs
        class="md:justify-self-center"
        :items="tabs"
        :model-value="activeTab"
        @update:model-value="value => emit('update:activeTab', value as ProductTab)"
      />
      <div class="flex flex-wrap items-center justify-end gap-3 md:flex-nowrap md:justify-self-end">
        <slot name="actions" />
      </div>
    </div>
    <slot name="bar" />
    <slot name="error" />
  </div>
</template>
