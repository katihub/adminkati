<script setup lang="ts">
import { DatePicker } from "@ark-ui/vue/date-picker";

defineOptions({ inheritAttrs: false });
</script>

<template>
  <DatePicker.Context v-slot="api">
    <slot :api="api" />
  </DatePicker.Context>
</template>
