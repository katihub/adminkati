<script setup lang="ts">
import type { ProductCheckAction, ProductCheckItem } from "@/types/api/marketplace-product-check"
import { computed, ref } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useProductCheckAction, useProductChecks } from "@/composables/useProductChecks"
import { useToastAction } from "@/composables/useToastAction"
// fallow-ignore-file complexity -- one declarative screen: the products to check and the reason dialog
import { isAdministration } from "@/utils/administration"
import { productCheckActions, productCheckLowestPrice, productCheckNeedsReason } from "@/utils/product-check"

/* CHECK AFTER, NOT BEFORE (7 November 2026). A shop whose seller is active puts
   its products online at once; the team sees them here and can mark them seen,
   hide them (undoable), ask for a correction, or delete them (direction only).
   Sellers under watch still go through the validation tab. */
const { t, locale } = useI18n()
const session = useCachedSession()
const roles = computed(() => session.value?.roles ?? [])
const query = useProductChecks()
const action = useProductCheckAction()
const run = useToastAction()
const shopFilter = ref("")
const pending = ref<{ product: ProductCheckItem; action: ProductCheckAction } | null>(null)
const reason = ref("")
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }))
const shops = computed(() =>
  [...new Map((query.data.value ?? []).map(item => [item.proposeParBoutique.id, item.proposeParBoutique.nom]))].sort(
    (a, b) => a[1].localeCompare(b[1], locale.value),
  ),
)
const products = computed(() =>
  (query.data.value ?? []).filter(item => !shopFilter.value || item.proposeParBoutique.id === shopFilter.value),
)
const reasonValid = computed(() => reason.value.trim().length >= 3)

function price(product: ProductCheckItem) {
  const lowest = productCheckLowestPrice(product)
  return lowest === null ? t("operations.productChecks.noPrice") : money.value.format(lowest)
}

async function act(product: ProductCheckItem, chosen: ProductCheckAction) {
  if (productCheckNeedsReason(chosen)) {
    reason.value = ""
    pending.value = { product, action: chosen }
    return
  }
  await run(() => action.mutateAsync({ id: product.id, action: chosen }), t(`operations.productChecks.done.${chosen}`))
}

async function confirm() {
  if (!pending.value || !reasonValid.value) return
  const { product, action: chosen } = pending.value
  const done = await run(
    () => action.mutateAsync({ id: product.id, action: chosen, motif: reason.value.trim() }),
    t(`operations.productChecks.done.${chosen}`),
  )
  if (done) pending.value = null
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="products-to-check-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-10"
    >
      <NativeSelect
        v-model="shopFilter"
        :aria-label="t('operations.productChecks.shopFilter')"
        data-testid="products-to-check-shop"
      >
        <NativeSelectOption value="">{{ t("operations.productChecks.allShops") }}</NativeSelectOption>
        <NativeSelectOption v-for="[id, name] in shops" :key="id" :value="id">{{ name }}</NativeSelectOption>
      </NativeSelect>
      <p class="text-xs text-muted-foreground" aria-live="polite">
        {{ t("operations.productChecks.count", { count: products.length }) }}
      </p>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <p class="mb-4 max-w-3xl text-sm text-muted-foreground">{{ t("operations.productChecks.help") }}</p>
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 4" :key="n" class="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard v-else-if="!products.length" icon="ph:checks" :text="t('operations.productChecks.empty')" />
      <ul v-else class="grid gap-3 xl:grid-cols-2">
        <li
          v-for="product in products"
          :key="product.id"
          class="flex min-w-0 gap-3 rounded-lg border border-border bg-card p-4"
          :data-testid="`product-to-check-${product.id}`"
        >
          <img
            v-if="product.images[0]"
            :src="product.images[0].url"
            :alt="product.images[0].texteAlternatif ?? product.nom"
            class="size-20 shrink-0 rounded-md border border-border bg-background object-contain"
          />
          <div
            v-else
            class="grid size-20 shrink-0 place-items-center rounded-md border border-dashed border-border text-muted-foreground"
          >
            <Icon name="ph:image" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="min-w-0 truncate font-heading font-semibold">{{ product.nom }}</h3>
              <Badge variant="secondary">{{
                product.nouveau ? t("operations.productChecks.new") : t("operations.productChecks.changed")
              }}</Badge>
              <Badge v-if="product.statut === 'suspendu'" variant="destructive">{{
                t("operations.productChecks.hidden")
              }}</Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ product.proposeParBoutique.nom }} · {{ product.categorie ?? "—" }} · {{ price(product) }}
              <template v-if="product.offres.length > 1">
                · {{ t("operations.productChecks.variants", { count: product.offres.length }) }}</template
              >
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ t("operations.productChecks.since", { date: date.format(new Date(product.aControlerDepuis)) }) }}
            </p>
            <p v-if="product.descriptionCourte" class="mt-2 line-clamp-2 text-sm">{{ product.descriptionCourte }}</p>
            <p v-if="product.motifDecision" class="mt-2 text-xs text-destructive">
              {{ t("operations.productChecks.reasonShown", { reason: product.motifDecision }) }}
            </p>
            <div class="mt-3 flex flex-wrap gap-1">
              <Button
                v-for="chosen in productCheckActions(product, roles)"
                :key="chosen"
                size="sm"
                :variant="chosen === 'seen' ? 'default' : chosen === 'delete' ? 'ghost' : 'outline'"
                :class="chosen === 'delete' ? 'text-destructive' : undefined"
                :disabled="action.isPending.value"
                :data-testid="`product-check-${chosen}`"
                @click="act(product, chosen)"
                >{{ t(`operations.productChecks.actions.${chosen}`) }}</Button
              >
              <Button v-if="isAdministration(roles)" size="sm" variant="ghost" as-child>
                <NuxtLinkLocale :to="{ path: '/products', query: { id: product.id } }">{{
                  t("operations.productChecks.actions.edit")
                }}</NuxtLinkLocale>
              </Button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <Dialog :open="Boolean(pending)" @update:open="value => (value ? null : (pending = null))">
      <DialogContent data-testid="product-check-reason-form">
        <DialogHeader>
          <DialogTitle>{{ pending ? t(`operations.productChecks.dialog.${pending.action}`) : "" }}</DialogTitle>
          <DialogDescription>{{
            pending
              ? t("operations.productChecks.dialog.help", {
                  product: pending.product.nom,
                  shop: pending.product.proposeParBoutique.nom,
                })
              : ""
          }}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="confirm">
          <div class="grid gap-2">
            <Label for="product-check-reason">{{ t("operations.productChecks.dialog.reason") }}</Label>
            <Textarea
              id="product-check-reason"
              v-model="reason"
              rows="3"
              maxlength="1000"
              data-testid="product-check-reason"
            />
            <p class="text-xs text-muted-foreground">{{ t("operations.productChecks.dialog.reasonHelp") }}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" :disabled="action.isPending.value" @click="pending = null">{{
              t("operations.productChecks.dialog.cancel")
            }}</Button>
            <Button
              type="submit"
              :variant="pending?.action === 'delete' ? 'destructive' : 'default'"
              :disabled="action.isPending.value || !reasonValid"
              data-testid="product-check-confirm"
              >{{ t("operations.productChecks.dialog.confirm") }}</Button
            >
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
