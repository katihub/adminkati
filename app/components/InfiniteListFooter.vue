<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"

const { hasNextPage, isFetchingNextPage, error, loadingLabel, failedLabel, sentinelTestId, failedTestId } =
  defineProps<{
    hasNextPage: boolean
    isFetchingNextPage: boolean
    error: unknown
    loadingLabel: string
    failedLabel: string
    sentinelTestId: string
    failedTestId: string
  }>()

const emit = defineEmits<{ loadMore: [] }>()
const { t } = useI18n()

/**
 * The next page loads by itself as the end of the list approaches: a sentinel
 * overlays the last 16rem of the list and the observer sees it before the end
 * is reached. A `rootMargin` would do nothing here — it does not cross the
 * panel's scroll container, verified in a real browser: a 1px sentinel only
 * fired on the very last pixel.
 *
 * THREE GUARDS, because an observer only notifies on a CHANGE.
 * - No new request while a page is arriving.
 * - Check again when it lands: on a tall panel the sentinel can stay visible,
 *   and without this the list would stop halfway.
 * - Nothing after a failure, otherwise a failing endpoint gets hammered; the
 *   operator retries by hand from the error strip.
 */
const sentinel = ref<HTMLElement | null>(null)
const sentinelVisible = ref(false)
useIntersectionObserver(sentinel, ([entry]) => {
  sentinelVisible.value = entry?.isIntersecting ?? false
})

const shouldLoadMore = computed(() => sentinelVisible.value && hasNextPage && !isFetchingNextPage && !error)
watch(
  shouldLoadMore,
  should => {
    if (should) emit("loadMore")
  },
  { flush: "post" },
)
</script>

<template>
  <div v-if="isFetchingNextPage" role="status">
    <span class="sr-only">{{ loadingLabel }}</span>
    <slot name="loading" />
  </div>
  <div
    v-if="error"
    :data-testid="failedTestId"
    role="alert"
    class="mt-3 flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5"
  >
    <Icon name="ph:warning-circle" size="18" class="shrink-0 text-destructive" aria-hidden="true" />
    <p class="min-w-0 flex-1 text-sm">
      {{ failedLabel }}
    </p>
    <Button type="button" variant="outline" size="sm" @click="emit('loadMore')">
      {{ t("stats.retry") }}
    </Button>
  </div>
  <div
    v-if="hasNextPage && !error"
    ref="sentinel"
    :data-testid="sentinelTestId"
    aria-hidden="true"
    class="pointer-events-none relative -mt-64 h-64"
  />
</template>
