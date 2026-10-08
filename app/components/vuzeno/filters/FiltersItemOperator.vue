<script setup lang="ts">
import { PhCheck } from '@phosphor-icons/vue';
import { Menu } from "@/components/vuzeno/menu";
import { Button } from "../button";
import { injectFiltersContext } from "./context";
import type { Operator } from "./operator";
import { filtersMenuItemVariants } from "./variants";

const modelValue = defineModel<string>();

defineProps<{
  options: Operator<unknown>[];
}>();

const { variant, size } = injectFiltersContext();
</script>

<template>
  <Menu.Root :positioning="{ placement: 'bottom' }">
    <Menu.Trigger as-child>
      <Button
        :variant="variant"
        :size="size"
        :class="filtersMenuItemVariants({ size })"
        aria-label="Filter operator"
      >
        {{ options.find(option => option.value === modelValue)?.label }}
      </Button>
    </Menu.Trigger>
    <Menu.Content>
      <Menu.ItemGroup>
        <Menu.Item
          v-for="option in options" 
          :key="option.value" 
          :value="option.value" 
          :class="filtersMenuItemVariants({ size })"
          @click="modelValue = option.value" 
        >
          {{ option.label }}
          <PhCheck class="ml-auto size-4 text-primary" :class="{
  'opacity-0': option.value !== modelValue,
}" />
        </Menu.Item>
      </Menu.ItemGroup>
    </Menu.Content>
  </Menu.Root>
</template>
