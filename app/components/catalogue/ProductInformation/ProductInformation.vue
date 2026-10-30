<script setup lang="ts">
import type { AdminMarketplaceProduct } from "@/types/api/catalogue-products"
const { product } = defineProps<{ product: AdminMarketplaceProduct }>()
const { t } = useI18n()
const fields = computed(() => [
  { label: t("catalogue.shortDescription"), value: product.descriptionCourte },
  { label: t("catalogue.descriptionLabel"), value: product.description },
  { label: t("catalogue.technical"), value: product.ficheTechnique },
])
const pdfUrl = computed(() =>
  product.ficheTechniquePdfUrl?.startsWith("https://") ? product.ficheTechniquePdfUrl : null,
)
</script>
<template>
  <div class="flex flex-col gap-5">
    <div v-if="product.images.length" class="flex gap-3 overflow-x-auto">
      <img
        v-for="image in product.images"
        :key="image.id"
        :src="image.url"
        :alt="image.texteAlternatif"
        class="size-32 shrink-0 rounded-xl border border-border object-contain"
        loading="lazy"
      />
    </div>
    <p v-else class="text-xs text-muted-foreground">{{ t("catalogue.noImage") }}</p>
    <section v-for="field in fields" :key="field.label" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold">{{ field.label }}</h3>
      <p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
        {{ field.value ?? t("catalogue.notProvided") }}
      </p>
    </section>
    <a v-if="pdfUrl" :href="pdfUrl" target="_blank" rel="noopener noreferrer" class="text-sm text-primary underline">{{
      t("catalogue.technicalPdf")
    }}</a>
  </div>
</template>
