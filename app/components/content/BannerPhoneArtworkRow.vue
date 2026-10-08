<script setup lang="ts">
import type { ArtworkIssue, Dimensions } from "@/utils/banner-artwork"
import { computed, useTemplateRef } from "vue"

/**
 * What phones show, as a titled block: the banner's own phone artwork when it has one (replace or
 * remove it), otherwise the large artwork cropped at the focus point, shown as that crop.
 */
const {
  previewUrl,
  cropUrl,
  focus,
  dimensions,
  file,
  issue,
  pendingRemoval = false,
} = defineProps<{
  /** The phone artwork: the staged file's blob URL, else the saved one — none once staged for removal. */
  previewUrl: string | null
  /** The large artwork, cropped at the focus point while phones have none of their own. */
  cropUrl: string | null
  focus: number
  dimensions: Dimensions | null
  file: File | null
  issue?: ArtworkIssue
  /** The saved phone artwork is staged for removal: the block shows it gone, with a way back. */
  pendingRemoval?: boolean
}>()
const emit = defineEmits<{
  "update:file": [file: File | null]
  "update:dimensions": [dimensions: Dimensions | null]
  remove: []
  undoRemove: []
}>()

const { t } = useI18n()

const fileInputRef = useTemplateRef<HTMLInputElement>("fileInput")
const { formatError, openPicker, onInputChange, dropListeners } = useArtworkPicker(fileInputRef, {
  picked: (picked, measured) => {
    emit("update:dimensions", measured)
    emit("update:file", picked)
  },
  unreadable: () => emit("update:dimensions", null),
})

const hasOwnArtwork = computed(() => previewUrl !== null)
const thumbUrl = computed(() => previewUrl ?? cropUrl)
const thumbPosition = computed(() => (previewUrl ? undefined : `${focus}% center`))
const title = computed(() =>
  t(hasOwnArtwork.value ? "content.banners.form.phone.ownTitle" : "content.banners.form.phone.noneTitle"),
)
const detail = computed(() => {
  if (hasOwnArtwork.value) return t("content.banners.form.phone.ownDetail")
  return cropUrl
    ? t("content.banners.form.phone.noneDetail", { focus })
    : t("content.banners.form.phone.noneDetailNoArtwork")
})
</script>

<template>
  <ContentBannerFormField
    data-testid="banner-artwork-field-mobile"
    icon="ph:device-mobile-duotone"
    :label="t('content.banners.form.phone.label')"
    v-on="dropListeners"
  >
    <template #note>
      {{ t("content.banners.form.phone.optional") }}
    </template>

    <div class="space-y-2">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-muted/50 p-3">
        <span class="grid h-14 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-background">
          <!-- The same fixed IPX modifiers as the large artwork's preview, so the crop reuses its cached download. -->
          <NuxtImg
            v-if="thumbUrl"
            :data-testid="hasOwnArtwork ? 'banner-artwork-field-mobile-preview' : undefined"
            :src="thumbUrl"
            alt=""
            format="webp"
            :quality="60"
            width="400"
            class="size-full object-cover"
            :style="{ objectPosition: thumbPosition }"
          />
          <Icon v-else name="ph:image-duotone" size="20" class="opacity-50" aria-hidden="true" />
        </span>

        <div class="min-w-0 flex-1 basis-56 space-y-0.5">
          <p class="flex flex-wrap items-center gap-x-2 text-sm font-medium">
            {{ title }}
            <span
              v-if="hasOwnArtwork && dimensions"
              data-testid="banner-artwork-field-mobile-dimensions"
              class="rounded-full bg-accent-foreground/10 px-2 py-0.5 text-xs font-medium text-accent-foreground tabular-nums"
            >
              {{ t("content.banners.form.artwork.dimensions", { width: dimensions.width, height: dimensions.height }) }}
            </span>
          </p>
          <p data-testid="banner-artwork-field-mobile-detail" class="text-sm text-muted-foreground">
            {{ detail }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <template v-if="hasOwnArtwork">
            <TooltipIconButton
              icon="ph:pencil-simple"
              :label="t('content.banners.form.artwork.replaceMobile')"
              class="bg-foreground/10 hover:bg-foreground/15"
              data-testid="banner-artwork-field-mobile-replace"
              @click="openPicker"
            />
            <TooltipIconButton
              icon="ph:trash"
              variant="destructive"
              :label="t('content.banners.form.artwork.removeMobile')"
              data-testid="banner-artwork-field-mobile-remove"
              @click="emit('remove')"
            />
          </template>
          <TooltipIconButton
            v-else
            icon="ph:upload-simple"
            :label="t('content.banners.form.artwork.addMobile')"
            class="bg-foreground/10 hover:bg-foreground/15"
            data-testid="banner-artwork-field-mobile-dropzone"
            @click="openPicker"
          />
        </div>
      </div>

      <p
        v-if="pendingRemoval && !file"
        data-testid="banner-artwork-field-mobile-pending-removal"
        class="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground"
      >
        {{ t("content.banners.form.artwork.mobileRemoved") }}
        <button
          type="button"
          data-testid="banner-artwork-field-mobile-undo-remove"
          class="font-medium text-primary underline-offset-4 hover:underline"
          @click="emit('undoRemove')"
        >
          {{ t("content.banners.form.artwork.undoRemove") }}
        </button>
      </p>
      <ContentBannerArtworkMessages variante="mobile" :file="file" :format-error="formatError" :issue="issue" />

      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-testid="banner-artwork-field-mobile-input"
        class="sr-only"
        @change="onInputChange"
      />
    </div>
  </ContentBannerFormField>
</template>
