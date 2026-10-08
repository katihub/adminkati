<script setup lang="ts">
import type { EmplacementBanniere } from "@/types/api/vitrine"
import type { ArtworkIssue, Dimensions } from "@/utils/banner-artwork"
import { computed, ref, useTemplateRef, watch } from "vue"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { bannerFrameClass } from "@/utils/banner-artwork"

/**
 * The large artwork as the hero of the form, in the frame the panel shows it in, so opening
 * Edit does not move it. The focus picker is laid over it through the `overlay` slot.
 */
const { previewUrl, file, dimensions, issue, focus, emplacement } = defineProps<{
  /** The staged file's blob URL, else the saved artwork's. */
  previewUrl: string | null
  file: File | null
  /** The size of what `previewUrl` shows. */
  dimensions: Dimensions | null
  issue?: ArtworkIssue
  /** Horizontal crop position, 0–100 (`BanniereAdmin.focus`). */
  focus?: number
  emplacement: EmplacementBanniere
}>()
const emit = defineEmits<{
  "update:file": [file: File | null]
  "update:dimensions": [dimensions: Dimensions | null]
}>()

const { t } = useI18n()

const fileInputRef = useTemplateRef<HTMLInputElement>("fileInput")
const { formatError, isDraggingFile, openPicker, onInputChange, dropListeners } = useArtworkPicker(fileInputRef, {
  picked: (picked, measured) => {
    emit("update:dimensions", measured)
    emit("update:file", picked)
  },
  unreadable: () => emit("update:dimensions", null),
})

const imageLoaded = ref(false)
watch(
  () => previewUrl,
  () => {
    imageLoaded.value = false
  },
)

const frameClass = computed(() =>
  cn(
    "relative overflow-hidden rounded-2xl bg-muted transition-colors",
    bannerFrameClass(emplacement),
    isDraggingFile.value && "ring-2 ring-primary",
  ),
)
const objectPosition = computed(() => `${focus ?? 50}% center`)
</script>

<template>
  <ContentBannerFormField
    data-testid="banner-artwork-field-large"
    icon="ph:image-duotone"
    :label="t('content.banners.form.large.label')"
    flush
  >
    <template #note>
      {{ t("content.banners.form.large.required") }}
    </template>
    <div class="space-y-2">
      <div :class="frameClass" v-on="dropListeners">
        <template v-if="previewUrl">
          <Skeleton v-if="!imageLoaded" class="absolute inset-0" />
          <!-- The same fixed IPX modifiers as `BannerArtworkPreview.vue`, so a matching URL shares its cached download.
             A staged file's `blob:` URL never matches an origin `@nuxt/image` rewrites, so it passes through unchanged. -->
          <NuxtImg
            data-testid="banner-artwork-field-large-preview"
            :src="previewUrl"
            alt=""
            format="webp"
            :quality="60"
            width="400"
            class="size-full object-cover transition-opacity duration-200"
            :class="imageLoaded ? 'opacity-100' : 'opacity-0'"
            :style="{ objectPosition }"
            @load="imageLoaded = true"
            @error="imageLoaded = true"
          />

          <slot name="overlay" />

          <!-- The large artwork is the banner itself: it is replaced, never removed. -->
          <button
            type="button"
            data-testid="banner-artwork-field-large-replace"
            :aria-label="t('content.banners.form.artwork.replaceLarge')"
            class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
            @click="openPicker"
          >
            <Icon name="ph:pencil-simple" size="14" aria-hidden="true" />
          </button>
          <div
            class="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-xs text-white tabular-nums"
          >
            <span
              v-if="dimensions"
              data-testid="banner-artwork-field-large-dimensions"
              class="rounded-full bg-black/55 px-2.5 py-0.5"
            >
              {{ t("content.banners.form.artwork.dimensions", { width: dimensions.width, height: dimensions.height }) }}
            </span>
            <span
              data-testid="banner-form-focus"
              class="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-0.5"
              :title="t('content.banners.form.focusLabel')"
            >
              <Icon name="ph:target-duotone" aria-hidden="true" />
              {{ t("content.banners.form.focusValue", { focus: focus ?? 50 }) }}
            </span>
          </div>
        </template>

        <button
          v-else
          type="button"
          data-testid="banner-artwork-field-large-dropzone"
          class="flex size-full flex-col items-center justify-center gap-1.5 p-6 text-center text-muted-foreground transition-colors hover:bg-foreground/5"
          @click="openPicker"
        >
          <Icon name="ph:upload-simple" size="26" aria-hidden="true" />
          <span class="text-sm font-medium">{{ t("content.banners.form.artwork.dropzoneLabel") }}</span>
          <span class="text-xs">{{ t("content.banners.form.artwork.dropzoneHint") }}</span>
        </button>

        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          data-testid="banner-artwork-field-large-input"
          class="sr-only"
          @change="onInputChange"
        />
      </div>

      <ContentBannerArtworkMessages variante="large" :file="file" :format-error="formatError" :issue="issue" />
    </div>
  </ContentBannerFormField>
</template>
