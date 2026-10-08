<script setup lang="ts">
defineProps<{
  title: string
  body: string
}>()
</script>

<template>
  <div>
    <AdminPageHeader :title="title">
      <p>{{ body }}</p>
    </AdminPageHeader>
  </div>
</template>
