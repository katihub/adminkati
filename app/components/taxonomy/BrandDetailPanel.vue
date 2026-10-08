<script setup lang="ts">
import type { Marque } from "@/types/api/taxonomie"
import { computed, ref, watch } from "vue"
import BrandPanelView from "@/components/taxonomy/BrandPanelView.vue"
import BrandProductsTab from "@/components/taxonomy/BrandProductsTab.vue"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { logoDevNameUrl } from "@/utils/logo-dev"

const props = withDefaults(
  defineProps<{
    open: boolean
    brand: Marque | null
    notFound?: boolean
    error?: unknown
  }>(),
  {
    notFound: false,
    error: undefined,
  },
)

const emit = defineEmits<{ "update:open": [value: boolean] }>()
const { t } = useI18n()
const { logoDevPublishableKey } = useRuntimeConfig().public
const activeTab = ref<"overview" | "products">("overview")
const tabs = computed(() => [
  { value: "overview", label: t("taxonomy.panel.overview"), testid: "brand-panel-tab-overview" },
  { value: "products", label: t("taxonomy.panel.products"), testid: "brand-panel-tab-products" },
])

const brandImageUrl = computed(() => (props.brand ? logoDevNameUrl(props.brand.nom, logoDevPublishableKey) : null))

watch(
  () => props.brand?.slug,
  () => {
    activeTab.value = "overview"
  },
)
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="data-[side=right]:w-full sm:data-[side=right]:max-w-lg" data-testid="brand-panel">
      <SheetHeader>
        <SheetTitle>{{ t("taxonomy.brands.title") }}</SheetTitle>
        <SheetDescription>{{ t("taxonomy.brands.description") }}</SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <ApiErrorCard v-if="error" :error="error" />
        <section v-else-if="notFound" data-testid="brand-panel-not-found">
          <p class="text-sm text-muted-foreground">
            {{ t("taxonomy.brands.notFound") }}
          </p>
          <Button class="mt-4" variant="outline" @click="emit('update:open', false)">
            {{ t("taxonomy.panel.close") }}
          </Button>
        </section>
        <template v-else-if="brand">
          <PillTabs
            :model-value="activeTab"
            :items="tabs"
            data-testid="brand-panel-tabs"
            @update:model-value="value => (activeTab = value as 'overview' | 'products')"
          />
          <BrandProductsTab v-if="activeTab === 'products'" :brand-name="brand.nom" class="mt-5" />
          <BrandPanelView v-else :brand="brand" :image-url="brandImageUrl" class="mt-5" />
        </template>
      </div>
    </SheetContent>
  </Sheet>
</template>
