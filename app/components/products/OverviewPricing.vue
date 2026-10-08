<script setup lang="ts">
import { computed, ref, toRefs } from "vue"
import { Input } from "@/components/ui/input"

const props = defineProps<{
  name: string
  price: string
  referencePrice: string
  discount: string
  /** La fenêtre de la remise, au format du champ date (`2026-09-30`). */
  promoDebut: string
  promoFin: string
  /** Vrai quand la référence n'est pas supérieure au prix : la base refusera. */
  promotionIncoherente?: boolean
  disabled?: boolean
  generating?: boolean
}>()
const emit = defineEmits<{
  "update:name": [value: string]
  "update:price": [value: string]
  "update:referencePrice": [value: string]
  "update:discount": [value: string]
  "update:promoDebut": [value: string]
  "update:promoFin": [value: string]
}>()
const { name, price, referencePrice, discount, promoDebut, promoFin, promotionIncoherente, disabled, generating } =
  toRefs(props)

const { t } = useI18n()
const priceFocused = ref(false)
const referencePriceFocused = ref(false)

function formatPrice(value: string) {
  const match = /^(\d+)(\.\d+)?$/.exec(value)
  if (!match) return value

  const whole = match[1]
  if (!whole) return value

  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${match[2] ?? ""}`
}

const displayedPrice = computed(() => (priceFocused.value ? price.value : formatPrice(price.value)))
const displayedReferencePrice = computed(() =>
  referencePriceFocused.value ? referencePrice.value : formatPrice(referencePrice.value),
)

function updateName(value: unknown) {
  emit("update:name", String(value))
}

function updatePrice(value: unknown) {
  emit("update:price", String(value))
}

function updateReferencePrice(value: unknown) {
  emit("update:referencePrice", String(value))
}

function updateDiscount(value: unknown) {
  emit("update:discount", String(value))
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-3">
      <!-- <span data-testid="products-detail-overview-badge-new"
      class="inline-block rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
      {{ t("products.overview.newArrival") }}
    </span> -->

      <div class="rounded-md" :class="generating && 'ai-generating'">
        <Input
          data-testid="products-detail-overview-title"
          type="text"
          :model-value="name"
          :disabled="disabled"
          class="text-2xl sm:text-3xl md:text-3xl font-bold tracking-tight text-foreground border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 rounded-none shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:border-primary focus-visible:ring-0"
          @update:model-value="updateName"
        />
      </div>
      <slot name="name-suggestion" />

      <!-- Ratings Row -->
      <!-- <div data-testid="products-detail-overview-ratings" class="flex flex-wrap items-center gap-2 text-sm">
      <div class="flex items-center gap-0.5 text-amber-400">
        <Icon v-for="s in 5" :key="s" name="ph:star-fill" size="16" aria-hidden="true" />
      </div>
      <span class="font-semibold text-foreground">[4.5]</span>
      <a href="#reviews" class="text-primary font-medium hover:underline">{{
        t("products.overview.reviewsCount", { count: 623 }) }}</a>
      <span class="text-primary font-medium">{{ t("products.overview.saidCount", { count: "1.919" })
      }}</span>
    </div> -->

      <!-- Price -->
      <div
        data-testid="products-detail-overview-price"
        class="flex items-baseline gap-2 text-2xl sm:text-3xl font-bold tracking-tight text-primary"
      >
        <span class="shrink-0">{{ t("products.overview.currency") }}</span>
        <Input
          data-testid="products-detail-overview-price-input"
          type="text"
          inputmode="numeric"
          :model-value="displayedPrice"
          :disabled="disabled"
          class="w-auto flex-1 text-2xl sm:text-3xl md:text-3xl font-medium tracking-tight font-heading text-foreground! border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 rounded-none shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:border-primary focus-visible:ring-0"
          @focus="priceFocused = true"
          @blur="priceFocused = false"
          @update:model-value="updatePrice"
        />
      </div>
    </div>

    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="min-w-0 space-y-1">
          <label for="overview-reference-price" class="block text-xs text-muted-foreground">
            {{ t("products.overview.referencePrice") }}
          </label>
          <div class="flex items-baseline gap-1">
            <span class="shrink-0 text-sm font-semibold text-foreground">{{ t("products.overview.currency") }}</span>
            <Input
              id="overview-reference-price"
              data-testid="products-detail-overview-reference-price-input"
              type="text"
              inputmode="numeric"
              :model-value="displayedReferencePrice"
              :disabled="disabled"
              class="h-auto w-auto flex-1 text-sm font-semibold text-foreground border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 rounded-none shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:border-primary focus-visible:ring-0"
              @focus="referencePriceFocused = true"
              @blur="referencePriceFocused = false"
              @update:model-value="updateReferencePrice"
            />
          </div>
        </div>

        <div class="min-w-0 space-y-1">
          <label for="overview-discount" class="block text-xs text-muted-foreground">
            {{ t("products.overview.discount") }}
          </label>
          <div class="flex items-baseline gap-1">
            <Input
              id="overview-discount"
              data-testid="products-detail-overview-discount-input"
              type="number"
              :model-value="discount"
              :disabled="disabled"
              class="h-auto w-auto flex-1 text-sm font-semibold text-foreground border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 rounded-none shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:border-primary focus-visible:ring-0"
              @update:model-value="updateDiscount"
            />
            <span class="shrink-0 text-sm font-semibold text-foreground">%</span>
          </div>
        </div>
      </div>

      <p
        v-if="promotionIncoherente"
        data-testid="products-detail-overview-promo-incoherente"
        role="alert"
        class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
      >
        {{ t("products.overview.promoIncoherente") }}
      </p>

      <!-- LA PROMOTION A UNE FIN, ET C'EST TOUT L'INTÉRÊT DE CES DEUX CHAMPS.
         Une remise posée à la main sans date y reste jusqu'à ce que quelqu'un
         pense à la retirer — la promo de fin d'année encore affichée en
         février est le mode de panne classique de toute boutique. Les deux
         bornes restent facultatives : vide au début signifie « déjà
         commencée », vide à la fin « sans terme », ce qu'un déstockage
         permanent demande légitimement. -->
      <div v-if="referencePrice" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="min-w-0 space-y-1">
          <div class="flex items-center gap-1">
            <label for="overview-promo-debut" class="block text-xs text-muted-foreground">
              {{ t("products.overview.promoDebut") }}
            </label>
            <InfoTip data-testid="products-detail-overview-promo-info" :text="t('products.overview.promoHint')" />
          </div>
          <ProductsOverviewDateField
            id="overview-promo-debut"
            data-testid="products-detail-overview-promo-debut"
            :model-value="promoDebut"
            :disabled="disabled"
            @update:model-value="value => emit('update:promoDebut', value)"
          />
        </div>
        <div class="min-w-0 space-y-1">
          <div class="flex items-center gap-1">
            <label for="overview-promo-fin" class="block text-xs text-muted-foreground">
              {{ t("products.overview.promoFin") }}
            </label>
            <InfoTip data-testid="products-detail-overview-promo-info" :text="t('products.overview.promoHint')" />
          </div>
          <ProductsOverviewDateField
            id="overview-promo-fin"
            data-testid="products-detail-overview-promo-fin"
            :model-value="promoFin"
            :disabled="disabled"
            @update:model-value="value => emit('update:promoFin', value)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
