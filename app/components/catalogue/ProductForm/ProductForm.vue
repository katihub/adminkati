<script setup lang="ts">
import type { AdminMarketplaceProduct, MarketplaceProductCorrection } from "@/types/api/catalogue-products"
import type { MarketplaceCategory } from "@/types/api/marketplace-categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { catalogueProductDraftSchema } from "@/schemas/catalogue-product"
import { catalogueCategoryOptions } from "@/utils/catalogue-categories"
const { product, categories, saving, error } = defineProps<{
  product: AdminMarketplaceProduct | null
  categories: MarketplaceCategory[]
  saving: boolean
  error: unknown
}>()
const emit = defineEmits<{
  save: [input: MarketplaceProductCorrection & { slug?: string }]
  cancel: []
  dirty: [value: boolean]
}>()
const { t } = useI18n()
const draft = reactive({
  nom: product?.nom ?? "",
  marque: product?.marque ?? "",
  categorieId: product?.categorieId ?? "",
  description: product?.description ?? "",
  descriptionCourte: product?.descriptionCourte ?? "",
  ficheTechnique: product?.ficheTechnique ?? "",
  slug: product?.slug ?? "",
  motif: "",
})
const original = JSON.stringify(draft)
watch(draft, () => emit("dirty", JSON.stringify(draft) !== original), { deep: true })
const fields = computed(() => [
  { key: "nom" as const, label: t("catalogue.name"), testid: "name", max: 240, min: 2, multiline: false },
  { key: "marque" as const, label: t("catalogue.brand"), testid: "brand", max: 120, min: 1, multiline: false },
  {
    key: "descriptionCourte" as const,
    label: t("catalogue.shortDescription"),
    testid: "short",
    max: 300,
    min: 10,
    multiline: true,
  },
  {
    key: "description" as const,
    label: t("catalogue.descriptionLabel"),
    testid: "description",
    max: 10000,
    min: 2,
    multiline: true,
  },
  {
    key: "ficheTechnique" as const,
    label: t("catalogue.technical"),
    testid: "technical",
    max: 20000,
    min: 2,
    multiline: true,
  },
])
const options = computed(() => catalogueCategoryOptions(categories, true))
const valid = computed(
  () =>
    catalogueProductDraftSchema.safeParse(draft).success &&
    (product
      ? draft.motif.trim().length >= 5
      : /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) && draft.slug.length >= 2 && draft.slug.length <= 180),
)
function save() {
  if (!valid.value || saving) return
  const parsed = catalogueProductDraftSchema.safeParse(draft)
  if (!parsed.success) return
  const { slug, motif, ...data } = parsed.data
  const nullable = Object.fromEntries(
    ["marque", "description", "descriptionCourte", "ficheTechnique"].map(key => [
      key,
      data[key as keyof typeof data] || null,
    ]),
  )
  emit("save", { ...data, ...nullable, modifieLe: product?.modifieLe ?? "", motif, slug: product ? undefined : slug })
}
</script>
<template>
  <form class="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6" @submit.prevent="save">
    <h2 class="text-lg font-semibold">{{ t(product ? "catalogue.edit" : "catalogue.new") }}</h2>
    <p class="text-sm text-muted-foreground">{{ t("catalogue.formHelp") }}</p>
    <ApiErrorCard v-if="error" :error="error" @retry="save" />
    <fieldset :disabled="saving" class="flex min-w-0 flex-col gap-4">
      <PointsOfSaleField v-if="!product" v-slot="{ field }" :label="t('catalogue.slug')"
        ><Input v-model="draft.slug" v-bind="field" maxlength="180" required data-testid="catalogue-product-slug"
      /></PointsOfSaleField>
      <PointsOfSaleField v-for="item in fields" :key="item.key" v-slot="{ field }" :label="item.label">
        <Textarea
          v-if="item.multiline"
          v-model="draft[item.key]"
          v-bind="field"
          :maxlength="item.max"
          :minlength="item.min"
          :rows="item.key === 'ficheTechnique' ? 6 : 3"
          :data-testid="`catalogue-product-${item.testid}`"
        />
        <Input
          v-else
          v-model="draft[item.key]"
          v-bind="field"
          :maxlength="item.max"
          :minlength="item.min"
          :required="item.key === 'nom'"
          :data-testid="`catalogue-product-${item.testid}`"
        />
      </PointsOfSaleField>
      <PointsOfSaleField v-slot="{ field }" :label="t('catalogue.category')"
        ><select
          v-model="draft.categorieId"
          v-bind="field"
          required
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          data-testid="catalogue-product-category"
        >
          <option value="" disabled>{{ t("catalogue.category") }}</option>
          <option v-for="option in options" :key="option.id" :value="option.id">{{ option.nom }}</option>
        </select></PointsOfSaleField
      >
      <PointsOfSaleField
        v-if="product"
        v-slot="{ field }"
        :label="t('catalogue.reason')"
        :detail="t('catalogue.reasonHelp')"
        ><Textarea
          v-model="draft.motif"
          v-bind="field"
          required
          minlength="5"
          maxlength="300"
          data-testid="catalogue-product-reason"
      /></PointsOfSaleField>
    </fieldset>
    <p v-if="!valid" class="text-xs text-muted-foreground">{{ t("catalogue.invalid") }}</p>
    <div class="flex justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        :disabled="saving"
        data-testid="catalogue-product-cancel"
        @click="emit('cancel')"
        >{{ t("catalogue.cancel") }}</Button
      ><Button type="submit" :disabled="!valid || saving" data-testid="catalogue-product-save" @click.prevent="save">{{
        t(saving ? "catalogue.saving" : "catalogue.save")
      }}</Button>
    </div>
  </form>
</template>
