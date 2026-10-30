<script setup lang="ts">
import type {
  AdminMarketplaceProduct,
  AdminMarketplaceProductDetail,
  MarketplaceProductCorrection,
} from "@/types/api/catalogue-products"
import type { MarketplaceCategory } from "@/types/api/marketplace-categories"
import { Skeleton } from "@/components/ui/skeleton"
defineProps<{
  detail?: AdminMarketplaceProductDetail
  error: unknown
  loading: boolean
  creating: boolean
  editing: boolean
  canEdit: boolean
  editor: {
    product: AdminMarketplaceProduct | null
    categories: MarketplaceCategory[]
    loading: boolean
    error: unknown
    saveError: unknown
    saving: boolean
  }
}>()
const emit = defineEmits<{
  retry: []
  retryCategories: []
  dirty: [value: boolean]
  save: [body: MarketplaceProductCorrection & { slug?: string }]
  cancel: []
  edit: []
  back: []
}>()
</script>
<template>
  <div class="min-w-0">
    <ClientOnly>
      <ApiErrorCard v-if="error && !creating" :error="error" @retry="emit('retry')" />
      <Skeleton v-else-if="loading" class="h-96 rounded-2xl" />
      <CatalogueProductEditor
        v-else-if="creating || editing"
        v-bind="editor"
        @retry="emit('retryCategories')"
        @dirty="emit('dirty', $event)"
        @save="emit('save', $event)"
        @cancel="emit('cancel')"
      />
      <CatalogueProductDetail
        v-else-if="detail"
        :detail="detail"
        :can-edit="canEdit"
        @edit="emit('edit')"
        @back="emit('back')"
      />
      <template #fallback><Skeleton class="h-96 rounded-2xl" /></template>
    </ClientOnly>
  </div>
</template>
