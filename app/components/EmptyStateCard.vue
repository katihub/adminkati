<script setup lang="ts">
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

defineProps<{
  icon: string
  text: string
  hint?: string
}>()
</script>

<template>
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Icon :name="icon" size="24" aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>{{ text }}</EmptyTitle>
      <EmptyDescription v-if="hint">
        {{ hint }}
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent v-if="$slots.default">
      <slot />
    </EmptyContent>
  </Empty>
</template>
