<script setup lang="ts">
import type { DevisLigne } from "@/types/api/devis"
import { PhCube } from "@phosphor-icons/vue"
import { computed, ref, watch } from "vue"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"
import { useCachedSession } from "@/composables/useCachedSession"
import { useProduit } from "@/composables/useProduit"
import { formatMontant } from "@/utils/money"
import { productImageUrl } from "@/utils/product-image-url"

const { line } = defineProps<{
  line: DevisLigne
}>()

const { locale } = useI18n()
const runtimeConfig = useRuntimeConfig()

/** Same as `orders/LineRow.vue`: client-only, best-effort — the quote line itself carries no
 *  image, only a produitId. Never blocks the initial render. */
/** The Products page (`definePageMeta({ roles: ["direction", "comptoir"] })`) is off-limits to
 *  other roles — linking there for everyone would send `preparation` into a 403. */
const session = useCachedSession()
const canViewProduct = computed(() => {
  const roles = session.value?.roles ?? []
  return roles.includes("direction") || roles.includes("comptoir")
})

const { data: product } = useProduit(
  computed(() => line.produitId),
  canViewProduct,
)
const imageUrl = computed(() =>
  productImageUrl(product.value?.images[0]?.url, runtimeConfig.public.catalogueImageOrigin),
)
const imageLoaded = ref(false)
watch(imageUrl, () => {
  imageLoaded.value = false
})

function lineTotal(current: DevisLigne) {
  return formatMontant(current.prixFige * current.quantite, locale.value).affiche
}
</script>

<template>
  <TableRow data-testid="quotes-detail-line" class="hover:bg-muted/40 transition-colors border-0">
    <TableCell class="w-14 px-2 whitespace-nowrap font-mono text-xs text-muted-foreground">
      {{ line.produitId }}
    </TableCell>
    <TableCell class="relative min-w-0 max-w-[200px] px-2 py-3">
      <div class="flex items-center gap-2.5">
        <div
          class="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground"
        >
          <template v-if="imageUrl">
            <Skeleton v-if="!imageLoaded" class="absolute inset-0" />
            <ProductsPicture
              :src="imageUrl"
              :alt="line.nomFige"
              width="36"
              height="36"
              loading="lazy"
              data-testid="quotes-detail-line-image"
              class="size-full object-cover transition-opacity duration-200"
              :class="imageLoaded ? 'opacity-100' : 'opacity-0'"
              @load="imageLoaded = true"
              @error="imageLoaded = true"
            />
          </template>
          <PhCube v-else :size="18" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-sm">
            <NuxtLinkLocale
              v-if="canViewProduct"
              :to="{ path: '/products', query: { id: String(line.produitId) } }"
              data-testid="quotes-detail-line-product-link"
              class="text-foreground after:absolute after:inset-0 hover:text-primary hover:underline"
            >
              {{ line.nomFige }}
            </NuxtLinkLocale>
            <span v-else class="text-foreground">{{ line.nomFige }}</span>
          </p>
          <p class="truncate font-mono text-xs text-muted-foreground mt-0.5">
            {{ line.slug }}
          </p>
        </div>
      </div>
    </TableCell>
    <TableCell
      class="whitespace-nowrap px-2 text-right font-mono text-xs sm:text-sm font-semibold tabular-nums text-foreground"
    >
      x{{ line.quantite }}
    </TableCell>
    <TableCell
      class="whitespace-nowrap px-2 text-right font-mono text-xs sm:text-sm tabular-nums text-muted-foreground"
    >
      {{ formatMontant(line.prixFige, locale).affiche }}
    </TableCell>
    <TableCell
      class="whitespace-nowrap px-2 text-right font-mono text-xs sm:text-sm tabular-nums font-semibold text-foreground"
    >
      {{ lineTotal(line) }}
    </TableCell>
  </TableRow>
</template>
