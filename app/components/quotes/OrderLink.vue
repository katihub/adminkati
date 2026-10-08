<script setup lang="ts">
defineProps<{
  reference: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="rounded-xl bg-primary/5 p-3 flex items-center justify-between gap-2">
    <div class="flex items-center gap-2 min-w-0">
      <Icon name="ph:shopping-cart" size="16" class="text-primary shrink-0" aria-hidden="true" />
      <NuxtLinkLocale
        :to="{ path: '/orders', query: { order: reference } }"
        class="text-xs sm:text-sm font-semibold text-primary hover:underline truncate"
        data-testid="quotes-detail-order-link"
      >
        {{ t("quotes.detail.orderLink", { reference }) }}
      </NuxtLinkLocale>
    </div>
    <Icon name="ph:arrow-right" size="14" class="text-primary shrink-0" aria-hidden="true" />
  </div>
</template>
