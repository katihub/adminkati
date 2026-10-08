<script setup lang="ts">
import { Menu } from "@/components/vuzeno/menu";
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { Button } from "../button";
import { injectFiltersContext } from "./context";
import { isField, isFieldGroup, isFieldSubmenu, type FilterFieldItem } from "./field";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const { fields, filters, variant } = injectFiltersContext();

function hasAvailableField(item: FilterFieldItem): boolean {
  if (isField(item)) {
    return !filters.value.some(filter => filter.field === item.key && filter.hidden !== true);
  }

  if (isFieldGroup(item) || isFieldSubmenu(item)) {
    return item.fields.some(hasAvailableField);
  }

  return false;
}

const hasAvailableFields = computed(() => fields.value.some(hasAvailableField));
</script>

<template>
  <Menu.Trigger v-if="hasAvailableFields" as-child aria-label="Add filter">
    <slot>
      <Button :variant="variant" size="icon-sm" :class="props.class">
        <Icon name="ph:funnel" />
      </Button>
    </slot>
  </Menu.Trigger>
</template>
