<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, ref, watch } from "vue"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<{
    brand: string
    imageUrl: string | null
    size?: "sm" | "md"
    decorative?: boolean
    testIdPrefix?: string
    class?: HTMLAttributes["class"]
  }>(),
  { size: "md", decorative: false },
)

const imageFailed = ref(false)

watch(
  () => props.imageUrl,
  () => {
    imageFailed.value = false
  },
)

const initials = computed(() => props.brand.trim().slice(0, 2).toUpperCase() || "—")
const logoClass = computed(() =>
  cn(
    "flex shrink-0 items-center justify-center overflow-hidden bg-muted font-semibold text-muted-foreground",
    props.size === "sm" ? "size-8 rounded-md text-xs" : "size-12 rounded-lg text-sm",
    props.class,
  ),
)
</script>

<template>
  <div :class="logoClass" :aria-hidden="decorative ? 'true' : undefined">
    <NuxtImg
      v-if="imageUrl && !imageFailed"
      provider="none"
      :src="imageUrl"
      :alt="decorative ? '' : brand"
      :width="size === 'sm' ? 32 : 48"
      :height="size === 'sm' ? 32 : 48"
      loading="lazy"
      decoding="async"
      class="size-full object-contain"
      :data-testid="testIdPrefix ? `${testIdPrefix}-image` : undefined"
      @error="imageFailed = true"
    />
    <span v-else aria-hidden="true" :data-testid="testIdPrefix ? `${testIdPrefix}-fallback` : undefined">
      {{ initials }}
    </span>
  </div>
</template>
