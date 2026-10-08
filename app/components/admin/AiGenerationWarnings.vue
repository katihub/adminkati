<script setup lang="ts">
import type { ProductCopyAssetWarning, ProductCopyAssets } from "@/types/ai/product-copy"

defineProps<{ assets: ProductCopyAssets; warnings: ProductCopyAssetWarning[] }>()

const { t } = useI18n()
</script>

<template>
  <div v-if="assets.candidateImageCount || warnings.length" class="flex flex-col gap-2 border-t pt-3">
    <p
      v-if="assets.candidateImageCount"
      data-testid="ai-generation-image-context"
      class="text-xs text-muted-foreground"
    >
      {{
        t("products.aiCopy.popup.imageContext", {
          count: assets.imageCount,
          candidate: assets.candidateImageCount,
          profile: t(`products.aiCopy.popup.settings.imageProfile.options.${assets.imageProfile}.label`),
        })
      }}
    </p>
    <ul v-if="warnings.length" class="flex flex-col gap-2">
      <li
        v-for="warning in warnings"
        :key="warning"
        :data-testid="`ai-generation-warning-${warning}`"
        class="flex items-start gap-1.5 text-xs text-muted-foreground"
      >
        <Icon name="ph:warning" size="14" class="mt-px shrink-0" aria-hidden="true" />
        <span>{{ t(`products.aiCopy.popup.warnings.${warning}`) }}</span>
      </li>
    </ul>
  </div>
</template>
