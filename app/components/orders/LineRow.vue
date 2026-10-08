<script setup lang="ts">
import type { CommandeLigneEquipe } from "@/types/api/commandes"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { useCachedSession } from "@/composables/useCachedSession"
import { useProduit } from "@/composables/useProduit"
import { formatMontant } from "@/utils/money"
import { productImageUrl } from "@/utils/product-image-url"

const { line, showTotal } = defineProps<{
  line: CommandeLigneEquipe
  showTotal: boolean
}>()

const { locale, t } = useI18n()
const runtimeConfig = useRuntimeConfig()

/** The Products page (`definePageMeta({ roles: ["direction", "comptoir"] })`) is off-limits to
 *  other roles — linking there for everyone would send `preparation` into a 403. */
const session = useCachedSession()
const canViewProduct = computed(() => {
  const roles = session.value?.roles ?? []
  return roles.includes("direction") || roles.includes("comptoir")
})

/** Client-only, best-effort — the order line itself carries no image, only a
 *  produitId. Not prefetched on the server, so it never blocks the initial render;
 *  it pops in once loaded, same pattern as `products/ListItem.vue`. */
const { data: product } = useProduit(
  computed(() => line.produitId),
  canViewProduct,
)
const imageUrl = computed(() =>
  productImageUrl(product.value?.images[0]?.url, runtimeConfig.public.catalogueImageOrigin),
)
const unitPrice = computed(() => line.prixFerme ?? line.prixCapture)
const totalPrice = computed(() => {
  const price = unitPrice.value
  if (price === null || price === undefined) return undefined
  return price * line.quantite
})

function formatPrice(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : formatMontant(value, locale.value).affiche
}
</script>

<template>
  <TableRow data-testid="orders-detail-line" class="hover:bg-muted/40 transition-colors">
    <TableCell class="w-14 px-2 whitespace-nowrap font-mono text-xs text-muted-foreground">
      {{ line.produitId }}
    </TableCell>
    <TableCell class="relative min-w-0 max-w-[200px] px-2 py-3">
      <div class="flex items-center gap-2.5">
        <OrdersLineImage
          :src="imageUrl"
          :alt="line.nomCapture"
          class="size-9 rounded-xl bg-muted object-cover shrink-0"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-sm">
            <NuxtLinkLocale
              v-if="canViewProduct"
              :to="{ path: '/products', query: { id: String(line.produitId) } }"
              data-testid="orders-detail-line-product-link"
              class="text-foreground after:absolute after:inset-0 hover:text-primary hover:underline"
            >
              {{ line.nomCapture }}
            </NuxtLinkLocale>
            <span v-else class="text-foreground">{{ line.nomCapture }}</span>
          </p>
          <p class="truncate font-mono text-xs text-muted-foreground mt-0.5">
            {{ line.slug }}
          </p>
          <div
            v-if="line.motifEcart"
            class="mt-1.5 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
          >
            <Icon name="ph:warning-circle" size="14" aria-hidden="true" class="shrink-0" />
            <span>{{ line.motifEcart }}</span>
          </div>
        </div>
      </div>
    </TableCell>
    <TableCell
      class="whitespace-nowrap px-2 text-right font-mono text-xs sm:text-sm font-semibold tabular-nums text-foreground"
    >
      x{{ line.quantite }}
    </TableCell>
    <TableCell class="whitespace-nowrap px-2">
      <Badge variant="secondary" class="rounded-full text-xs font-medium">
        {{ t(`orders.lineStatus.${line.statutLigne}`) }}
      </Badge>
    </TableCell>
    <TableCell
      v-if="showTotal"
      class="whitespace-nowrap px-2 text-right font-mono text-xs sm:text-sm tabular-nums text-muted-foreground"
      data-testid="orders-detail-line-unit-price"
    >
      {{ formatPrice(unitPrice) }}
    </TableCell>
    <TableCell
      v-if="showTotal"
      class="whitespace-nowrap px-2 text-right font-mono text-xs sm:text-sm tabular-nums font-semibold text-foreground"
      data-testid="orders-detail-line-total-price"
    >
      {{ formatPrice(totalPrice) }}
    </TableCell>
  </TableRow>
</template>
