<script setup lang="ts">
import type { ProductImage, TaxonomieMarque } from "@/types/api/produits"
import { computed, toRefs, useId } from "vue"
import { Input } from "@/components/ui/input"
import { logoDevNameUrl } from "@/utils/logo-dev"

const props = defineProps<{
  images: ProductImage[]
  productId: number | null
  brand: string | null
  brands: TaxonomieMarque[]
  mode: "add" | "edit"
  slug: string
  disabled?: boolean
  /** True while an AI run is writing the brand: the picker wears the generating ring. */
  generating?: boolean
  /** La fiche technique du constructeur, portee par le produit enregistre. */
  fichePdf?: string | null
  fichePdfNom?: string | null
  fichePdfOctets?: number | null
}>()
const emit = defineEmits<{
  "update:images": [value: ProductImage[]]
  "update:brand": [value: string | null]
  "update:slug": [value: string]
  stageLocal: [file: File]
}>()
const { images, productId, brand, brands, mode, slug, disabled, fichePdf, fichePdfNom, fichePdfOctets } = toRefs(props)

const { t } = useI18n()
const { logoDevPublishableKey } = useRuntimeConfig().public
const slugId = useId()

/** Same {value, label} shape `ProductsFilterCombobox` takes everywhere else it picks a brand
 *  (the product list's brand filter) — a brand's name doubles as its own option value. */
const brandOptions = computed(() =>
  brands.value.map(option => ({
    value: option.nom,
    label: option.nom,
    leadingImage: { src: logoDevNameUrl(option.nom, logoDevPublishableKey) },
  })),
)
const selectedBrand = computed(() => brandOptions.value.find(option => option.value === brand.value) ?? null)

function updateSlug(value: unknown) {
  emit("update:slug", String(value))
}
</script>

<template>
  <div class="space-y-6 lg:col-span-5">
    <!-- Images Section -->
    <ProductsImageGallery
      :model-value="images"
      :product-id="productId"
      :disabled="disabled"
      @update:model-value="value => emit('update:images', value)"
      @stage-local="file => emit('stageLocal', file)"
    />

    <!-- La fiche constructeur vit a cote des images : ce sont les deux pieces
         jointes d'un produit, et elles se gerent au meme endroit. Elle n'a de
         sens que sur un produit deja enregistre — il faut un id pour deposer. -->
    <ProductsDatasheetPanel
      v-if="mode === 'edit'"
      :product-id="productId"
      :fiche-pdf="fichePdf ?? null"
      :fiche-pdf-nom="fichePdfNom ?? null"
      :fiche-pdf-octets="fichePdfOctets ?? null"
      :disabled="disabled"
    />

    <!-- Brand card -->
    <div data-testid="products-detail-overview-store-card" class="rounded-2xl bg-card p-4 space-y-6">
      <h3 class="font-medium text-left text-lg flex items-center gap-1.5">
        <Icon name="ph:storefront-duotone" size="24" />
        {{ t("products.common.brand") }}
      </h3>
      <div class="txt-left">
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-medium text-muted-foreground">{{ t("products.overview.brand") }}</span>
        </div>
        <div class="rounded-md" :class="props.generating && 'ai-generating'">
          <ProductsFilterCombobox
            data-testid="products-detail-overview-brand-input"
            :options="brandOptions"
            :model-value="brand"
            :placeholder="t('products.overview.brandPlaceholder')"
            :label="t('products.overview.brand')"
            :disabled="disabled"
            class="h-9 w-full sm:w-full justify-between rounded-none border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 text-sm text-muted-foreground shadow-none hover:bg-transparent aria-expanded:bg-transparent focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:ring-0"
            @update:model-value="value => emit('update:brand', value)"
          />
        </div>
        <ProductsBrandLogoPreview
          v-if="selectedBrand"
          class="mt-3"
          :brand="selectedBrand.label"
          :image-url="selectedBrand.leadingImage.src"
        />
        <div class="mt-3 empty:hidden"><slot name="brand-suggestion" /></div>
      </div>

      <div v-if="mode === 'add'" class="text-left">
        <label :for="slugId" class="block text-xs text-muted-foreground">
          {{ t("products.detailForm.slug.label") }}
        </label>
        <Input
          :id="slugId"
          data-testid="products-detail-form-slug"
          type="text"
          :model-value="slug"
          :placeholder="t('products.detailForm.slug.placeholder')"
          :disabled="disabled"
          class="text-sm text-muted-foreground border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 rounded-none shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:ring-0"
          @update:model-value="updateSlug"
        />
      </div>
    </div>

    <slot name="after-brand" />
  </div>
</template>
