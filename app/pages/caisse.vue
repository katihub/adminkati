<script setup lang="ts">
definePageMeta({
  layout: "admin",
  roles: ["direction", "comptoir"],
  middleware: to =>
    navigateTo(
      {
        path: to.path.startsWith("/fr/") ? "/fr/operations" : "/operations",
        query: { ...to.query, tab: "cash-registers" },
      },
      { replace: true },
    ),
})

defineI18nRoute({
  paths: {
    en: "/cash-register",
    fr: "/caisse",
  },
})
</script>

<template>
  <div />
</template>
