<script setup lang="ts">
import type { DelaiLivraison } from "@/types/api/delais-livraison"
import type { TaxonomieCategorie, TaxonomieRayon } from "@/types/api/produits"
import { toRefs } from "vue"

const props = defineProps<{
  name: string
  price: string
  referencePrice: string
  discount: string
  promoDebut: string
  promoFin: string
  promotionIncoherente?: boolean
  disabled?: boolean
  deliveryIntervalId: number | null
  resolvedDeliveryInterval?: DelaiLivraison | null
  categories: TaxonomieCategorie[]
  selectedCategoryId: number | null
  categoryOpen: boolean
  secondaryCategoryIds: number[]
  departments: TaxonomieRayon[]
  activeDepartmentValue: string | null
  shortDescription: string
  shortDescriptionInputId: string
  longDescription: string
  longDescriptionInputId: string
  generating?: boolean
  /** The closed-list fields an AI run is writing right now; each wears the generating ring. */
  generatingFields?: readonly string[]
}>()
const emit = defineEmits<{
  "update:name": [value: string]
  "update:price": [value: string]
  "update:referencePrice": [value: string]
  "update:discount": [value: string]
  "update:promoDebut": [value: string]
  "update:promoFin": [value: string]
  "update:deliveryIntervalId": [value: number | null]
  "update:categoryOpen": [value: boolean]
  selectCategory: [id: number]
  "update:secondaryCategoryIds": [value: number[]]
  "update:activeDepartmentValue": [value: string]
  "update:shortDescription": [value: string]
  "update:longDescription": [value: string]
}>()
const {
  name,
  price,
  referencePrice,
  discount,
  promoDebut,
  promoFin,
  promotionIncoherente,
  disabled = false,
  categories,
  selectedCategoryId,
  categoryOpen,
  secondaryCategoryIds,
  departments,
  activeDepartmentValue,
  shortDescription,
  shortDescriptionInputId,
  longDescription,
  longDescriptionInputId,
  generating,
  generatingFields,
} = toRefs(props)

const isGenerating = (field: string) => generatingFields?.value?.includes(field) ?? false
</script>

<template>
  <div class="lg:col-span-7">
    <div class="rounded-3xl bg-card p-6 space-y-12">
      <!-- Header: Badge + Title + Ratings + Price -->
      <ProductsOverviewPricing
        :name="name"
        :price="price"
        :reference-price="referencePrice"
        :discount="discount"
        :disabled="disabled"
        :generating="generating"
        :promo-debut="promoDebut"
        :promo-fin="promoFin"
        :promotion-incoherente="promotionIncoherente"
        @update:name="value => emit('update:name', value)"
        @update:price="value => emit('update:price', value)"
        @update:reference-price="value => emit('update:referencePrice', value)"
        @update:discount="value => emit('update:discount', value)"
        @update:promo-debut="value => emit('update:promoDebut', value)"
        @update:promo-fin="value => emit('update:promoFin', value)"
      >
        <template #name-suggestion>
          <slot name="name-suggestion" />
        </template>
      </ProductsOverviewPricing>

      <ProductsOverviewDelivery
        :model-value="deliveryIntervalId"
        :resolved="resolvedDeliveryInterval"
        :disabled="disabled"
        @update:model-value="value => emit('update:deliveryIntervalId', value)"
      />

      <slot name="stock-indicator" />
      <slot name="initial-stock" />

      <div class="grid grid-cols-2 gap-6">
        <div class="space-y-3">
          <ProductsOverviewDepartments
            :generating="isGenerating('department')"
            :departments="departments"
            :active-value="activeDepartmentValue"
            :disabled="disabled"
            @update:active-value="value => emit('update:activeDepartmentValue', value)"
          />
          <slot name="department-suggestion" />
        </div>

        <div class="space-y-3">
          <ProductsOverviewCategories
            :generating="isGenerating('primaryCategory')"
            :categories="categories"
            :selected-id="selectedCategoryId"
            :open="categoryOpen"
            :disabled="disabled"
            @update:open="value => emit('update:categoryOpen', value)"
            @select="value => emit('selectCategory', value)"
          />
          <slot name="category-suggestion" />
        </div>
      </div>

      <div class="space-y-3">
        <ProductsOverviewSecondaryCategories
          :generating="isGenerating('secondaryCategories')"
          :categories="categories"
          :selected-ids="secondaryCategoryIds"
          :disabled="disabled"
          @update:selected-ids="value => emit('update:secondaryCategoryIds', value)"
        />
        <slot name="secondary-categories-suggestion" />
      </div>

      <ProductsOverviewShortDescription
        :model-value="shortDescription"
        :input-id="shortDescriptionInputId"
        :disabled="disabled"
        :generating="generating"
        @update:model-value="value => emit('update:shortDescription', value)"
      >
        <template #suggestion>
          <slot name="short-description-suggestion" />
        </template>
      </ProductsOverviewShortDescription>

      <ProductsOverviewLongDescription
        :model-value="longDescription"
        :input-id="longDescriptionInputId"
        :disabled="disabled"
        :generating="generating"
        @update:model-value="value => emit('update:longDescription', value)"
      >
        <template #suggestion>
          <slot name="long-description-suggestion" />
        </template>
      </ProductsOverviewLongDescription>

      <!-- Reviews Section
      <div
        id="reviews" data-testid="products-detail-overview-reviews"
        class="space-y-3 pt-2 border-t border-border/40"
      >
        <h4 class="text-sm font-semibold text-foreground">
          {{ t("products.overview.reviews") }}
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="review in mockReviews"
            :key="review.id"
            class="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-2"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-foreground text-sm">{{ review.author }}</span>
              <span class="text-muted-foreground">{{ review.date }}</span>
            </div>
            <div class="flex items-center gap-0.5 text-amber-400">
              <Icon v-for="s in review.rating" :key="s" name="ph:star-fill" size="13" aria-hidden="true" />
            </div>
            <p class="text-xs text-muted-foreground leading-relaxed">
              {{ review.comment }}
            </p>
          </div>
        </div>
      </div> -->
    </div>
  </div>
</template>
