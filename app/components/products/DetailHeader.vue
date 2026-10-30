<script setup lang="ts">
import type { ProductTab } from "@/types/product-tab"
import { computed, toRefs } from "vue"

const props = defineProps<{
  productName: string | undefined
  historyCount: number
  activeTab: ProductTab
  showStock: boolean
  canWrite?: boolean
}>()
const emit = defineEmits<{ "update:activeTab": [value: ProductTab] }>()
const { productName, historyCount, activeTab, showStock, canWrite } = toRefs(props)

const { t } = useI18n()

const tabs = computed(() => [
  { value: "overview", label: t("products.tabs.overview") },
  ...(showStock.value ? [{ value: "stock", label: t("products.tabs.stock") }] : []),
  { value: "history", label: t("products.tabs.history", { count: historyCount.value }) },
])
</script>

<template>
  <div class="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
    <div
      class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 xl:grid xl:grid-cols-[minmax(12rem,1fr)_auto_minmax(12rem,1fr)]"
    >
      <div class="min-w-0">
        <h3 class="truncate font-heading text-base font-bold text-foreground" :title="productName">
          {{ productName || t("products.page.newProductTitle") }}
        </h3>
        <p class="mt-0.5 text-xs text-muted-foreground">
          {{ canWrite ? t("products.detailForm.editHint") : t("products.detailForm.readOnly") }}
        </p>
      </div>
      <PillTabs
        class="xl:justify-self-center"
        :items="tabs"
        :model-value="activeTab"
        @update:model-value="value => emit('update:activeTab', value as ProductTab)"
      />
      <div class="flex flex-wrap items-center justify-end gap-3 xl:flex-nowrap xl:justify-self-end">
        <slot name="actions" />
      </div>
    </div>
    <slot name="bar" />
    <slot name="error" />
  </div>
</template>
