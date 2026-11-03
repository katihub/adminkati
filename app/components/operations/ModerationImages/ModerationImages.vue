<script setup lang="ts">
import type { ModerationImage } from "@/types/api/marketplace-moderation"
import { Badge } from "@/components/ui/badge"

/** The photos under review: proposed by the shop (published on approval) or already public. */
const { images = [], title } = defineProps<{ images?: ModerationImage[]; title: string }>()
const { t } = useI18n({ useScope: "local" })
const statusLabel = (image: ModerationImage) => (image.statut === "publiee" ? t("published") : t("proposed"))
</script>

<template>
  <div data-testid="moderation-images">
    <h4 class="text-sm font-medium">{{ title }}</h4>
    <p v-if="!images.length" class="mt-2 text-sm text-muted-foreground">{{ t("none") }}</p>
    <ul v-else class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <li v-for="image in images" :key="image.id" class="flex flex-col gap-1">
        <a :href="image.url" target="_blank" rel="noopener noreferrer" class="block">
          <img
            :src="image.url"
            :alt="image.texteAlternatif ?? ''"
            loading="lazy"
            class="aspect-square w-full rounded-md border border-border bg-white object-contain"
          />
        </a>
        <Badge variant="outline" class="self-start text-[0.7rem]">{{ statusLabel(image) }}</Badge>
      </li>
    </ul>
  </div>
</template>

<i18n lang="json">
{
  "en": { "none": "No photo sent.", "proposed": "Proposed", "published": "Published" },
  "fr": { "none": "Aucune photo envoyée.", "proposed": "Proposée", "published": "Publiée" }
}
</i18n>
