<script setup lang="ts">
const {
  title,
  busy = false,
  empty = false,
} = defineProps<{
  title: string
  busy?: boolean
  empty?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-3xl bg-card p-5 text-card-foreground sm:p-6"
    :aria-busy="busy || undefined"
    data-testid="stats-block"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <h2 class="min-w-0 truncate font-heading text-base font-medium tracking-tight">
          {{ title }}
        </h2>
        <Spinner v-if="busy" size="xs" class="shrink-0 text-muted-foreground" />
      </div>
      <div v-if="$slots.header || $slots.action" class="flex shrink-0 items-center gap-2">
        <slot name="header" />
        <slot name="action" />
      </div>
    </header>

    <p v-if="empty" class="text-sm text-muted-foreground" data-testid="stats-block-empty">
      {{ t("stats.vide") }}
    </p>
    <div v-else class="min-w-0" :class="busy && 'stats-shimmer'">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/*
  Dims the ink without touching layout: a refetching block keeps its height, so
  the grid never reflows under the cursor mid-read.
*/
.stats-shimmer {
  animation: stats-shimmer-pulse 1.6s ease-in-out infinite;
}

@keyframes stats-shimmer-pulse {
  50% {
    opacity: 0.45;
  }
}

/*
  Held at a steady dim rather than removed entirely: it is the only signal that
  the figures on screen are being replaced.
*/
@media (prefers-reduced-motion: reduce) {
  .stats-shimmer {
    animation: none;
    opacity: 0.6;
  }
}
</style>
