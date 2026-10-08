<script setup lang="ts">
definePageMeta({
  layout: "admin",
  roles: ["direction", "comptoir"],
  middleware: to =>
    navigateTo(
      {
        path: to.path.startsWith("/fr/") ? "/fr/operations" : "/operations",
        query: { ...to.query, tab: "customer-requests" },
      },
      { replace: true },
    ),
})

defineI18nRoute({
  paths: {
    en: "/assistant",
    fr: "/demandes",
  },
})
</script>

<template>
  <div />
</template>
