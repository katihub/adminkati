<script setup lang="ts">
const { size = "md" } = defineProps<{ size?: "sm" | "md" }>()

const { t } = useI18n({ useScope: "local" })

const compact = computed(() => size === "sm")
</script>

<template>
  <span class="inline-flex items-center" :class="compact ? 'gap-1.5' : 'gap-2'">
    <!--
      Decorative: the wordmark beside it already says NowTech, so an alt here
      would make a screen reader announce the brand twice.
    -->
    <NuxtImg src="/logo.avif" alt="" width="32" height="32" class="shrink-0" :class="compact ? 'size-6' : 'size-8'" />

    <span class="font-bold tracking-tight" :class="compact ? 'text-lg' : 'text-2xl'">
      <span class="text-foreground">{{ t("now") }}</span
      ><span class="text-primary">{{ t("tech") }}</span>
    </span>
  </span>
</template>

<i18n lang="json">
{
  "en": {
    "now": "Now",
    "tech": "Tech"
  },
  "fr": {
    "now": "Now",
    "tech": "Tech"
  }
}
</i18n>
