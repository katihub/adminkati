<script setup lang="ts">
import { computed } from "vue"
import { richSegments } from "@/utils/site-texts"

const props = defineProps<{ text: string }>()
const segments = computed(() => richSegments(props.text))
</script>

<template>
  <span>
    <template v-for="(segment, i) in segments" :key="i">
      <strong v-if="segment.kind === 'bold'">{{ segment.text }}</strong>
      <a
        v-else-if="segment.kind === 'link'"
        :href="segment.href"
        class="text-primary underline"
        target="_blank"
        rel="noopener"
        >{{ segment.text }}</a
      >
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>
