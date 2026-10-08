<script setup lang="ts">
import type { ArtworkIssue } from "@/utils/banner-artwork"
import { computed } from "vue"

const { variante, file, formatError, issue } = defineProps<{
  variante: "large" | "mobile"
  file: File | null
  formatError: string
  issue?: ArtworkIssue
}>()

/** `BUCKETS.branding.tailleMax` — a warning, not a block; the backend still enforces it. */
const SIZE_WARNING_BYTES = 15 * 1024 * 1024

const { t } = useI18n()

/** Most urgent first: an unreadable file, a file the backend would refuse here, then a slow upload. */
const messages = computed(() =>
  [
    { kind: "error", text: formatError, className: "text-destructive" },
    { kind: "issue", text: issue ? t(`content.banners.form.artwork.${issue}`) : "", className: "text-destructive" },
    {
      kind: "size-warning",
      text: file && file.size > SIZE_WARNING_BYTES ? t("content.banners.form.artwork.sizeWarning") : "",
      className: "text-warning",
    },
  ].filter(message => message.text),
)
</script>

<template>
  <div v-if="messages.length" class="space-y-1">
    <p
      v-for="message in messages"
      :key="message.kind"
      :data-testid="`banner-artwork-field-${variante}-${message.kind}`"
      class="text-sm"
      :class="message.className"
    >
      {{ message.text }}
    </p>
  </div>
</template>
