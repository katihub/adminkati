<script setup lang="ts">
import type { ProductDetail } from "@/types/api/produits"
import { computed, toRefs } from "vue"
import { Button } from "@/components/ui/button"
import { storefrontProductUrl } from "@/utils/storefront"

const props = defineProps<{
  mode: "add" | "edit"
  canWrite: boolean
  isSaving: boolean
  isDirty: boolean
  product: ProductDetail | null
}>()
const emit = defineEmits<{ cancel: [] }>()
const { mode, canWrite, isSaving, isDirty, product } = toRefs(props)

const { t } = useI18n()
const editableProduct = computed(() => (canWrite.value && mode.value === "edit" ? product.value : null))
const { storefrontUrl } = useRuntimeConfig().public
// A withdrawn product is no longer listed on the storefront, and an unsaved one has no page yet.
const storefrontLink = computed(() =>
  mode.value === "edit" && product.value && !product.value.retire_le
    ? storefrontProductUrl(storefrontUrl, product.value.slug)
    : null,
)
const saveLabel = computed(() =>
  t(mode.value === "add" ? "products.detailForm.save.add" : "products.detailForm.save.edit"),
)
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3 md:flex-nowrap">
    <Button v-if="storefrontLink" as-child variant="outline" data-testid="products-detail-storefront-link">
      <a :href="storefrontLink" target="_blank" rel="noopener noreferrer">
        <Icon name="ph:arrow-square-out" size="16" aria-hidden="true" />
        {{ t("products.detailForm.storefront") }}
      </a>
    </Button>
    <ProductsLifecycleControls v-if="editableProduct" :product="editableProduct" />

    <Button
      v-if="canWrite && isDirty"
      type="button"
      variant="secondary"
      data-testid="products-detail-form-cancel"
      :disabled="isSaving"
      @click="emit('cancel')"
    >
      <Icon name="ph:x" size="16" aria-hidden="true" />
      {{ t("products.detailForm.cancel") }}
    </Button>
    <Button
      v-if="canWrite && isDirty"
      type="submit"
      class="bg-primary/20 text-primary hover:text-primary-foreground"
      data-testid="products-detail-form-save"
      :disabled="isSaving"
      :aria-busy="isSaving || undefined"
    >
      <Spinner v-if="isSaving" data-icon="inline-start" />
      <Icon v-else name="ph:floppy-disk" size="16" aria-hidden="true" />
      {{ saveLabel }}
    </Button>
  </div>
</template>
