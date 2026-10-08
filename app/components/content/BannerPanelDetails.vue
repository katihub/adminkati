<script setup lang="ts">
import type { BanniereAdmin } from "@/types/api/vitrine"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { bannerEmplacement, storedMobileDimensions } from "@/utils/banner-artwork"
import { parseEditor } from "@/utils/banner-editor"
import { formatDateCourte } from "@/utils/dates"

const { banner } = defineProps<{
  banner: BanniereAdmin
}>()

const { t, locale } = useI18n()

const editor = computed(() => parseEditor(banner.modifiee_par))

const emplacementText = computed(() => t(`content.banners.emplacement.${bannerEmplacement(banner)}`))

/** A missing phone artwork is a choice with a consequence, so it says what a phone gets instead. */
const mobileText = computed(() => {
  const size = storedMobileDimensions(banner)
  return size
    ? t("content.banners.panel.mobileSize", { width: size.width, height: size.height })
    : t("content.banners.panel.mobileMissing")
})
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <div class="flex items-center justify-between">
      <h3 class="font-bold text-lg flex items-center gap-3">
        <span data-testid="banner-panel-libelle">{{ banner.libelle }}</span>
        <Badge
          data-testid="banner-panel-status"
          class="border-0!"
          :class="banner.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
        >
          {{ t(banner.active ? "content.banners.status.active" : "content.banners.status.inactive") }}
        </Badge>
      </h3>
    </div>
    <div class="flex items-center gap-2">
      <Icon name="ph:gradient-duotone" size="20" class="opacity-80" />
      <span data-testid="banner-panel-emplacement">{{ emplacementText }}</span>
    </div>
    <div class="flex items-center gap-2">
      <Icon name="ph:scales-duotone" size="20" class="opacity-80" />
      <span data-testid="banner-panel-mobile">{{ mobileText }}</span>
      <span
        data-testid="banner-panel-focus"
        class="px-2 py-0.5 rounded-full flex items-center gap-x-1 bg-accent-foreground/10 text-accent-foreground font-medium"
      >
        <Icon name="ph:target-duotone" /> {{ `${banner.focus}%` }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <Icon name="ph:link-duotone" size="20" class="opacity-80" />
      <span data-testid="banner-panel-href">{{ banner.href }}</span>
    </div>
    <div class="flex items-start gap-2">
      <Icon name="ph:text-aa-duotone" size="20" class="mt-0.5 shrink-0 opacity-80" />
      <p data-testid="banner-panel-alt" class="min-w-0 p-2 bg-muted rounded-lg wrap-break-word">
        <span class="sr-only">{{ t("content.banners.panel.alt") }}: </span>{{ banner.alt }}
      </p>
    </div>
    <!-- Bottom right of the block: who last edited the banner, and when. -->
    <div
      data-testid="banner-panel-editor-rail"
      class="mt-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2 pt-2"
    >
      <template v-if="editor">
        <span class="opacity-80">{{ t("content.banners.panel.editedBy") }}</span>
        <ContentBannerEditorPill :editor="editor" />
        <span class="font-medium">{{ t("content.banners.panel.editedOn") }}</span>
      </template>
      <span v-else class="opacity-80">{{ t("content.banners.panel.editedAt") }}</span>
      <span
        data-testid="banner-panel-modified"
        class="px-2 py-0.5 rounded-full flex items-center gap-x-1 bg-accent-foreground/10 text-accent-foreground"
      >
        <Icon name="ph:calendar-dots-duotone" />
        <span>{{ formatDateCourte(banner.modifiee_le, locale) }}</span>
      </span>
    </div>
  </div>
</template>
