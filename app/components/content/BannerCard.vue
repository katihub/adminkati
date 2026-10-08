<script setup lang="ts">
import type { BanniereAdmin } from "@/types/api/vitrine"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { bannerEmplacement, bannerFrameClass } from "@/utils/banner-artwork"
import { productImageUrl } from "@/utils/product-image-url"

const { banner, canWrite } = defineProps<{
  banner: BanniereAdmin
  canWrite: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
}>()

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

/** `url_large` is already absolute — `productImageUrl` is a defensive passthrough,
 *  keeping one code path for image URLs, matching `ListItem.vue:24`. */
const imageUrl = computed(
  () => productImageUrl(banner.url_large, runtimeConfig.public.catalogueImageOrigin) ?? banner.url_large,
)

/** The main carousel is a wide strip; a promo artwork is closer to 16:10 (3840 × 2372). */
const aspectClass = computed(() => bannerFrameClass(bannerEmplacement(banner)))
</script>

<template>
  <button
    type="button"
    data-testid="banner-card"
    class="group relative block w-full overflow-hidden rounded-2xl text-left"
    :class="aspectClass"
    @click="emit('select', banner.id)"
  >
    <!-- Same component `BannerPanel.vue`'s large preview uses, with the same fixed IPX
         modifiers — the grid card and the panel request the identical URL, so opening a
         card's panel is a cache hit, not a second download of the same artwork. -->
    <ContentBannerArtworkPreview
      testid="banner-card-artwork"
      :src="imageUrl"
      :alt="banner.alt"
      aspect-class="size-full"
      :focus="banner.focus"
    />

    <!-- GOTCHA: `@click.stop` only — never add `@pointerdown.stop` here. `.click.stop`
         stops a plain tap on the handle from also firing the card's own `@click` (which
         would incorrectly "select" the banner). `vue-draggable-plus`/SortableJS starts a
         drag by listening for `pointerdown` bubbling up from `.banner-drag-handle` to the
         sortable container; stopping it here means that event never arrives and dragging
         silently does nothing. -->
    <div
      v-if="canWrite"
      class="banner-drag-handle absolute right-3 top-3 z-10 flex size-8 cursor-grab items-center justify-center rounded-full bg-background/60 text-foreground ring-1 ring-white/15 backdrop-blur-md"
      data-testid="banner-card-drag-handle"
      @click.stop
    >
      <Icon name="ph:dots-six-vertical" size="18" aria-hidden="true" />
    </div>

    <!-- Without a mobile artwork, a phone gets the large one cropped around `focus`: worth seeing
         from the list, since that crop is what most visitors will get. -->
    <span
      v-if="!banner.url_mobile"
      data-testid="banner-card-no-mobile"
      class="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-md"
    >
      <Icon name="ph:device-mobile-slash" size="14" aria-hidden="true" />
      {{ t("content.banners.grid.noMobile") }}
    </span>

    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent"
      aria-hidden="true"
    />

    <div
      class="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl bg-background/60 px-3 py-2 backdrop-blur-md"
    >
      <p data-testid="banner-card-libelle" class="truncate text-sm font-medium text-foreground">
        {{ banner.libelle }}
      </p>
      <Badge
        data-testid="banner-card-status"
        :data-active="banner.active ? 'true' : 'false'"
        class="shrink-0 border-0!"
        :class="banner.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
      >
        {{ t(banner.active ? "content.banners.status.active" : "content.banners.status.inactive") }}
      </Badge>
    </div>
  </button>
</template>
