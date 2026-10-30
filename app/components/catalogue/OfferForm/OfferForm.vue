<script setup lang="ts">
import type { AdminMarketplaceOfferDetail, MarketplaceOfferCorrection } from "@/types/api/catalogue-products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { catalogueOfferDraftSchema } from "@/schemas/catalogue-product"
const { offer, saving, error } = defineProps<{
  offer: AdminMarketplaceOfferDetail["offre"]
  saving: boolean
  error: unknown
}>()
const emit = defineEmits<{ save: [input: MarketplaceOfferCorrection]; cancel: []; dirty: [value: boolean] }>()
const { t } = useI18n()
const draft = reactive({
  prixFcfa: offer.prixFcfa ?? "",
  prixReferenceFcfa: offer.prixReferenceFcfa ?? "",
  quantiteMinimale: offer.quantiteMinimale,
  garantieMois: offer.garantieMois ?? 0,
  delaiMaxJours: offer.delaiMaxJours ?? 3,
  motif: "",
})
const original = JSON.stringify(draft)
watch(draft, () => emit("dirty", JSON.stringify(draft) !== original), { deep: true })
const valid = computed(() => catalogueOfferDraftSchema.safeParse(draft).success)
const fields = computed(() => [
  { key: "prixFcfa" as const, label: t("catalogue.price"), testid: "price", min: 1, max: 2000000000 },
  {
    key: "prixReferenceFcfa" as const,
    label: t("catalogue.referencePrice"),
    testid: "reference",
    min: 1,
    max: 2000000000,
  },
  { key: "quantiteMinimale" as const, label: t("catalogue.moq"), testid: "moq", min: 1, max: 9999 },
  { key: "garantieMois" as const, label: t("catalogue.warranty"), testid: "warranty", min: 0, max: 120 },
  { key: "delaiMaxJours" as const, label: t("catalogue.delay"), testid: "delay", min: 0, max: 3 },
])
function save() {
  if (saving) return
  const parsed = catalogueOfferDraftSchema.safeParse(draft)
  if (!parsed.success) return
  emit("save", {
    ...parsed.data,
    prixReferenceFcfa: parsed.data.prixReferenceFcfa === "" ? null : parsed.data.prixReferenceFcfa,
    modifieLe: offer.modifieLe,
  })
}
</script>
<template>
  <form class="flex flex-col gap-4" @submit.prevent="save">
    <h3 class="font-semibold">{{ t("catalogue.editOffer") }}</h3>
    <p class="text-xs text-muted-foreground">{{ t("catalogue.stockHelp") }}</p>
    <ApiErrorCard v-if="error" :error="error" @retry="save" />
    <fieldset :disabled="saving" class="grid min-w-0 gap-4 sm:grid-cols-2">
      <PointsOfSaleField v-for="item in fields" :key="item.key" v-slot="{ field }" :label="item.label"
        ><Input
          v-model="draft[item.key]"
          v-bind="field"
          type="number"
          step="1"
          :min="item.min"
          :max="item.max"
          :data-testid="`catalogue-offer-${item.testid}`"
      /></PointsOfSaleField>
      <PointsOfSaleField
        v-slot="{ field }"
        :label="t('catalogue.reason')"
        :detail="t('catalogue.reasonHelp')"
        class="sm:col-span-2"
        ><Textarea
          v-model="draft.motif"
          v-bind="field"
          required
          minlength="5"
          maxlength="300"
          data-testid="catalogue-offer-reason"
      /></PointsOfSaleField>
    </fieldset>
    <p v-if="!valid" class="text-xs text-muted-foreground">{{ t("catalogue.invalid") }}</p>
    <div class="flex justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        :disabled="saving"
        data-testid="catalogue-offer-cancel"
        @click="emit('cancel')"
        >{{ t("catalogue.cancel") }}</Button
      ><Button type="submit" :disabled="saving || !valid" data-testid="catalogue-offer-save" @click.prevent="save">{{
        t(saving ? "catalogue.saving" : "catalogue.save")
      }}</Button>
    </div>
  </form>
</template>
