<script setup lang="ts">
import { Menu } from "@/components/vuzeno/menu";
import { injectFiltersContext } from "./context";
import FiltersMenuList from "./FiltersMenuList.vue";

const { fields } = injectFiltersContext();
</script>

<template>
  <Menu.Content class="min-w-48">
    <FiltersMenuList :items="fields" />
  </Menu.Content>
</template>
