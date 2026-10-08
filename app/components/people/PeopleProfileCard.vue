<script setup lang="ts">
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
</script>

<template>
  <section class="overflow-hidden rounded-3xl bg-card" data-testid="people-profile-card">
    <PeopleProfileHero
      :eyebrow="props.eyebrow"
      :title="props.title"
      :metadata="props.metadata"
      :editable="props.editable"
      :disabled="props.disabled"
      :title-label="props.titleLabel"
      @update:title="emit('update:title', $event)"
    />
    <div class="divide-y divide-border border-t border-border">
      <slot />
    </div>
  </section>
</template>
