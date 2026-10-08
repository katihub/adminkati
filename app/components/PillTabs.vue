<script setup lang="ts">
defineProps<{
  items: { value: string; label: string; icon?: string; testid?: string }[]
  modelValue: string
}>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()
</script>

<template>
  <div class="inline-flex items-center gap-1 rounded-full bg-muted/50 p-1">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-all"
      :class="
        modelValue === item.value
          ? 'bg-card text-foreground font-semibold shadow-xs'
          : 'text-muted-foreground hover:text-foreground'
      "
      :aria-current="modelValue === item.value ? 'true' : undefined"
      :data-testid="item.testid"
      @click="emit('update:modelValue', item.value)"
    >
      <Icon
        v-if="item.icon"
        :name="item.icon"
        size="16"
        aria-hidden="true"
        class="shrink-0"
        :data-testid="item.testid && `${item.testid}-icon`"
      />
      {{ item.label }}
    </button>
  </div>
</template>
