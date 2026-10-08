<script setup lang="ts">
defineProps<{ brand: string; imageUrl: string | null }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-3" data-testid="products-brand-logo-preview">
    <ProductsBrandLogo :brand="brand" :image-url="imageUrl" test-id-prefix="products-brand-logo" />
    <div class="min-w-0 flex-1">
      <!-- <p class="text-xs text-muted-foreground">{{ t("products.brandLogo.current") }}</p> -->
      <p class="truncate text-sm font-medium">{{ brand }}</p>
    </div>
    <a
      href="https://logo.dev"
      target="_blank"
      rel="noopener"
      class="shrink-0 text-xs text-muted-foreground underline underline-offset-4"
      data-testid="products-brand-logo-attribution"
    >
      {{ t("products.brandLogo.attribution") }}
    </a>
  </div>
</template>
