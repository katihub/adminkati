<script setup lang="ts">
import type { ProductCopyField, ProductCopySuggestion } from "@/types/ai/product-copy"
import { Button } from "@/components/ui/button"
import { logoDevNameUrl } from "@/utils/logo-dev"

const props = defineProps<{ field: ProductCopyField; suggestions: Partial<ProductCopySuggestion> }>()
const emit = defineEmits<{ apply: []; dismiss: [] }>()

const { t } = useI18n()
const { logoDevPublishableKey } = useRuntimeConfig().public
const { departmentName, categoryName } = useProductCopyLabels()
const value = computed(() => props.suggestions[props.field])
/** What the operator reads: names instead of the slugs and ids a choice field carries. */
const shown = computed(() => {
  const current = value.value
  if (props.field === "department" && typeof current === "string") return departmentName(current)
  if (props.field === "primaryCategory" && typeof current === "number") return categoryName(current)
  if (props.field === "secondaryCategories" && Array.isArray(current))
    return current.map(id => categoryName(Number(id)))
  return current
})
const brandLogoUrl = computed(() =>
  props.field === "brand" && typeof value.value === "string"
    ? logoDevNameUrl(value.value, logoDevPublishableKey)
    : null,
)
</script>

<template>
  <section
    v-if="value !== undefined"
    :data-testid="`product-copy-card-${field}`"
    :aria-label="t(`products.aiCopy.card.fields.${field}`)"
    class="ai-gradient-border space-y-2 rounded-xl p-3 text-sm"
  >
    <p class="flex items-center gap-1.5 text-xs font-medium">
      <AiIcon class="size-4" />
      {{ t(`products.aiCopy.card.fields.${field}`) }}
    </p>

    <ul v-if="Array.isArray(shown)" class="list-disc space-y-1 pl-5">
      <li v-for="(item, index) in shown" :key="index">{{ item }}</li>
    </ul>
    <div v-else-if="field === 'brand' && typeof value === 'string'" class="flex items-center gap-3">
      <ProductsBrandLogo :brand="value" :image-url="brandLogoUrl" test-id-prefix="product-copy-brand-logo" />
      <p class="min-w-0 truncate font-medium">{{ value }}</p>
    </div>
    <p v-else class="whitespace-pre-line">{{ shown }}</p>

    <div class="rounded-md my-3 bg-background border border-muted/80 flex gap-2 items-start p-2">
      <Icon name="ph:info" />
      <div class="space-y-1 5">
        <p class="text-xs text-muted-foreground">{{ t("products.aiCopy.card.notice") }}</p>
        <p v-if="field === 'features'" class="text-xs text-warning">
          {{ t("products.aiCopy.card.replacesFeatures") }}
        </p>
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        :data-testid="`product-copy-dismiss-${field}`"
        @click="emit('dismiss')"
      >
        {{ t("products.aiCopy.card.dismiss") }}
      </Button>
      <Button
        type="button"
        size="sm"
        class="ai-gradient-button border-0 font-semibold text-black hover:brightness-95"
        :data-testid="`product-copy-apply-${field}`"
        @click="emit('apply')"
      >
        {{ t("products.aiCopy.card.apply") }}
      </Button>
    </div>
  </section>
</template>
