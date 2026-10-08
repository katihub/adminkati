<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section data-testid="users-detail-incomplete" class="rounded-3xl bg-card p-4 sm:p-6">
    <div class="flex items-start gap-3">
      <Icon name="ph:warning-circle" size="20" class="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <h3 class="font-medium text-foreground">
          {{ t("users.detail.incompleteTitle") }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t("users.detail.incompleteBody") }}
        </p>
      </div>
    </div>
  </section>
</template>
