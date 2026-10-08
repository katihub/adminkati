<script setup lang="ts">
import { computed } from "vue"
import { Input } from "@/components/ui/input"

const props = withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    metadata?: string[]
    editable?: boolean
    disabled?: boolean
    titleLabel?: string
  }>(),
  {
    metadata: () => [],
    editable: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  "update:title": [value: string]
}>()

const initials = computed(
  () =>
    props.title
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.slice(0, 1).toLocaleUpperCase())
      .join("") || "?",
)

const visibleMetadata = computed(() => props.metadata.filter((value): value is string => Boolean(value)))

function updateTitle(value: unknown) {
  emit("update:title", String(value))
}
</script>

<template>
  <section class="overflow-hidden rounded-3xl bg-card" data-testid="people-profile-hero">
    <div class="h-20 border-b border-border/60 bg-success sm:h-24" aria-hidden="true" />
    <div class="relative px-4 pb-4 sm:px-6 sm:pb-6">
      <div class="flex flex-col gap-3 sm:-mt-10 sm:flex-row sm:items-end sm:gap-4">
        <div
          class="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-card bg-primary text-xl font-semibold text-primary-foreground shadow-sm sm:text-2xl"
          aria-hidden="true"
        >
          {{ initials }}
        </div>
      </div>
      <div class="min-w-0 mt-6 pb-0.5 sm:pb-1">
        <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {{ eyebrow }}
        </p>
        <Input
          v-if="editable"
          data-testid="people-profile-title-input"
          type="text"
          autocomplete="name"
          :model-value="title"
          :disabled="disabled"
          :aria-label="titleLabel ?? eyebrow"
          class="mt-1 h-auto w-full rounded-none border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 font-heading text-xl font-semibold tracking-tight text-foreground shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:border-primary focus-visible:ring-0 sm:text-2xl"
          @update:model-value="updateTitle"
        />
        <h3 v-else class="mt-1 truncate font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {{ title }}
        </h3>
        <div
          v-if="visibleMetadata.length"
          class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"
        >
          <template v-for="(item, index) in visibleMetadata" :key="item">
            <span>{{ item }}</span>
            <span v-if="index < visibleMetadata.length - 1" aria-hidden="true">•</span>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
