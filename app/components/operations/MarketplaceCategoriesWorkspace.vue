<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the tree, its form dialog and its delete confirmation
import type {
  MarketplaceCategory,
  MarketplaceSubcategory,
  UpdateCategoryInput,
  WarrantyUnit,
} from "@/types/api/marketplace-categories"
import { computed, reactive, ref } from "vue"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useMarketplaceCategories, useMarketplaceCategoryMutations } from "@/composables/useMarketplaceCategories"
import { useToastAction } from "@/composables/useToastAction"

type Node = MarketplaceCategory | MarketplaceSubcategory
type FormMode = { kind: "create"; parent: MarketplaceCategory | null } | { kind: "edit"; node: Node }

const { t } = useI18n()
const query = useMarketplaceCategories()
const mutations = useMarketplaceCategoryMutations()
const run = useToastAction()
const search = ref("")
const formMode = ref<FormMode | null>(null)
const deleting = ref<Node | null>(null)
const form = reactive({ nom: "", inherit: false, valeur: 0, unite: "mois" as WarrantyUnit, ordre: 0, attributs: "" })
const pending = computed(() => Object.values(mutations).some(mutation => mutation.isPending.value))

const categories = computed(() => {
  const needle = search.value.trim().toLowerCase()
  const all = query.data.value ?? []
  if (!needle) return all
  return all
    .map(category => ({
      ...category,
      sousCategories: category.sousCategories.filter(sub => sub.nom.toLowerCase().includes(needle)),
    }))
    .filter(category => category.nom.toLowerCase().includes(needle) || category.sousCategories.length)
})
const isSubcategory = computed(() =>
  formMode.value?.kind === "create" ? Boolean(formMode.value.parent) : Boolean(formMode.value?.node.parentId),
)
const formTitle = computed(() => {
  const mode = formMode.value
  if (!mode) return ""
  if (mode.kind === "edit") return t("operations.categories.editTitle", { name: mode.node.nom })
  return mode.parent
    ? t("operations.categories.createSubTitle", { name: mode.parent.nom })
    : t("operations.categories.createTitle")
})
const warrantyError = computed(() => {
  if (form.inherit && isSubcategory.value) return ""
  if (!Number.isInteger(form.valeur) || form.valeur < 0) return t("operations.categories.warrantyInvalid")
  if ((form.unite === "annees" ? form.valeur * 12 : form.valeur) > 120)
    return t("operations.categories.warrantyTooLong")
  return ""
})
/** "Capacité, Couleur" becomes ["Capacité", "Couleur"]: trimmed, without case-insensitive duplicates. */
const attributes = computed(() => {
  const seen = new Set<string>()
  return form.attributs
    .split(",")
    .map(item => item.trim().replace(/\s+/g, " "))
    .filter(item => item && !seen.has(item.toLocaleLowerCase()) && seen.add(item.toLocaleLowerCase()))
})
const attributesError = computed(() =>
  attributes.value.length > 6 || attributes.value.some(item => item.length > 40)
    ? t("operations.categories.attributesInvalid")
    : "",
)
const formValid = computed(() => form.nom.trim().length >= 2 && !warrantyError.value && !attributesError.value)

function warrantyText(node: Node) {
  return node.garantie.mois > 0 ? node.garantie.libelle : t("operations.categories.noWarranty")
}

function attributesText(node: Node) {
  if (node.attributsVariante.length) return node.attributsVariante.join(", ")
  return node.parentId ? t("operations.categories.attributesInherited") : t("operations.categories.noAttributes")
}

function openCreate(parent: MarketplaceCategory | null) {
  Object.assign(form, { nom: "", inherit: Boolean(parent), valeur: 0, unite: "mois", ordre: 0, attributs: "" })
  formMode.value = { kind: "create", parent }
}

function openEdit(node: Node) {
  const own = node.garantieMinimaleMois
  const unite = node.uniteGarantie
  Object.assign(form, {
    nom: node.nom,
    inherit: own === null,
    valeur: own === null ? 0 : unite === "annees" ? own / 12 : own,
    unite,
    ordre: node.ordre,
    attributs: node.attributsVariante.join(", "),
  })
  formMode.value = { kind: "edit", node }
}

async function submit() {
  const mode = formMode.value
  if (!mode || !formValid.value) return
  const garantie = form.inherit && isSubcategory.value ? null : { valeur: form.valeur, unite: form.unite }
  const done =
    mode.kind === "create"
      ? await run(
          () =>
            mutations.create.mutateAsync({
              nom: form.nom.trim(),
              ordre: form.ordre,
              ...(attributes.value.length ? { attributsVariante: attributes.value } : {}),
              ...(mode.parent ? { parentId: mode.parent.id } : {}),
              ...(garantie ? { garantie } : {}),
            }),
          t("operations.categories.created"),
        )
      : await run(
          () =>
            mutations.update.mutateAsync({
              id: mode.node.id,
              body: {
                nom: form.nom.trim(),
                ordre: form.ordre,
                garantie,
                attributsVariante: attributes.value,
              } satisfies UpdateCategoryInput,
            }),
          t("operations.categories.updated"),
        )
  if (done) formMode.value = null
}

function toggleActive(node: Node) {
  void run(
    () => mutations.update.mutateAsync({ id: node.id, body: { active: !node.active } }),
    t(node.active ? "operations.categories.deactivated" : "operations.categories.activated"),
  )
}

async function confirmDelete() {
  const node = deleting.value
  if (!node) return
  if (await run(() => mutations.remove.mutateAsync(node.id), t("operations.categories.deleted"))) deleting.value = null
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="marketplace-categories-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10"
    >
      <label class="relative min-w-0 flex-1 sm:max-w-md">
        <Icon
          name="ph:magnifying-glass"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="search"
          class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          :placeholder="t('operations.categories.search')"
          :aria-label="t('operations.categories.search')"
        />
      </label>
      <Button size="sm" data-testid="category-create" @click="openCreate(null)"
        ><Icon name="ph:plus" /> {{ t("operations.categories.create") }}</Button
      >
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <p class="mb-4 max-w-3xl text-sm text-muted-foreground">{{ t("operations.categories.help") }}</p>
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 5" :key="n" class="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard
        v-else-if="!categories.length"
        icon="ph:tree-structure"
        :text="search ? t('operations.categories.noMatch') : t('operations.categories.empty')"
      />
      <ul v-else class="space-y-3">
        <li
          v-for="category in categories"
          :key="category.id"
          class="rounded-lg border border-border bg-card"
          :data-testid="`category-${category.slug}`"
        >
          <div class="flex flex-wrap items-center gap-3 p-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-heading font-semibold">{{ category.nom }}</h3>
                <Badge v-if="!category.active" variant="outline">{{ t("operations.categories.inactive") }}</Badge>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                <Icon name="ph:shield-check" class="align-[-2px]" />
                {{ t("operations.categories.minimumWarranty") }} :
                <strong class="text-foreground" data-testid="category-warranty">{{ warrantyText(category) }}</strong>
                · {{ t("operations.categories.productCount", { count: category.produits }) }} ·
                {{ t("operations.categories.subCount", { count: category.sousCategories.length }) }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                <Icon name="ph:sliders-horizontal" class="align-[-2px]" />
                {{ t("operations.categories.variantAttributes") }} :
                <strong class="text-foreground" data-testid="category-attributes">{{
                  attributesText(category)
                }}</strong>
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" :disabled="pending" @click="openCreate(category)"
                ><Icon name="ph:plus" /> {{ t("operations.categories.addSub") }}</Button
              >
              <Button size="sm" variant="ghost" :disabled="pending" @click="openEdit(category)">{{
                t("operations.categories.edit")
              }}</Button>
              <Button size="sm" variant="ghost" :disabled="pending" @click="toggleActive(category)">{{
                category.active ? t("operations.categories.deactivate") : t("operations.categories.activate")
              }}</Button>
              <Button
                size="sm"
                variant="ghost"
                class="text-destructive"
                :disabled="pending || category.produits > 0 || category.sousCategories.length > 0"
                :title="
                  category.produits || category.sousCategories.length ? t('operations.categories.deleteBlocked') : ''
                "
                @click="deleting = category"
                >{{ t("operations.categories.delete") }}</Button
              >
            </div>
          </div>
          <ul v-if="category.sousCategories.length" class="border-t border-border">
            <li
              v-for="sub in category.sousCategories"
              :key="sub.id"
              class="flex flex-wrap items-center gap-3 border-b border-border py-3 pl-8 pr-4 last:border-b-0"
              :data-testid="`category-${sub.slug}`"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <Icon name="ph:arrow-elbow-down-right" class="text-muted-foreground" />
                  <span class="font-medium">{{ sub.nom }}</span>
                  <Badge v-if="!sub.active" variant="outline">{{ t("operations.categories.inactive") }}</Badge>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ t("operations.categories.minimumWarranty") }} :
                  <strong class="text-foreground" data-testid="category-warranty">{{ warrantyText(sub) }}</strong>
                  <span v-if="sub.garantie.heritee"> ({{ t("operations.categories.inherited") }})</span>
                  · {{ t("operations.categories.productCount", { count: sub.produits }) }} ·
                  {{ t("operations.categories.variantAttributes") }} :
                  <strong class="text-foreground" data-testid="category-attributes">{{ attributesText(sub) }}</strong>
                </p>
              </div>
              <div class="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" :disabled="pending" @click="openEdit(sub)">{{
                  t("operations.categories.edit")
                }}</Button>
                <Button size="sm" variant="ghost" :disabled="pending" @click="toggleActive(sub)">{{
                  sub.active ? t("operations.categories.deactivate") : t("operations.categories.activate")
                }}</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-destructive"
                  :disabled="pending || sub.produits > 0"
                  :title="sub.produits ? t('operations.categories.deleteBlocked') : ''"
                  @click="deleting = sub"
                  >{{ t("operations.categories.delete") }}</Button
                >
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <Dialog :open="Boolean(formMode)" @update:open="value => (value ? null : (formMode = null))">
      <DialogContent data-testid="category-form">
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
          <DialogDescription>{{ t("operations.categories.formHelp") }}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="submit">
          <div class="grid gap-2">
            <Label for="category-name">{{ t("operations.categories.name") }}</Label>
            <Input id="category-name" v-model="form.nom" maxlength="80" data-testid="category-name" />
          </div>
          <fieldset class="grid gap-2">
            <legend class="text-sm font-medium">{{ t("operations.categories.minimumWarranty") }}</legend>
            <label v-if="isSubcategory" class="flex items-center gap-2 text-sm">
              <input v-model="form.inherit" type="checkbox" class="size-4" data-testid="category-inherit" />
              {{ t("operations.categories.inheritWarranty") }}
            </label>
            <div v-if="!form.inherit || !isSubcategory" class="flex gap-2">
              <Input
                v-model.number="form.valeur"
                type="number"
                min="0"
                :max="form.unite === 'annees' ? 10 : 120"
                class="w-28"
                :aria-label="t('operations.categories.warrantyValue')"
                data-testid="category-warranty-value"
              />
              <NativeSelect
                v-model="form.unite"
                :aria-label="t('operations.categories.warrantyUnit')"
                data-testid="category-warranty-unit"
              >
                <NativeSelectOption value="mois">{{ t("operations.categories.months") }}</NativeSelectOption>
                <NativeSelectOption value="annees">{{ t("operations.categories.years") }}</NativeSelectOption>
              </NativeSelect>
            </div>
            <p class="text-xs text-muted-foreground">{{ t("operations.categories.warrantyHelp") }}</p>
            <p v-if="warrantyError" class="text-xs text-destructive" role="alert">{{ warrantyError }}</p>
          </fieldset>
          <div class="grid gap-2">
            <Label for="category-attributes">{{ t("operations.categories.variantAttributes") }}</Label>
            <Input
              id="category-attributes"
              v-model="form.attributs"
              :placeholder="t('operations.categories.attributesPlaceholder')"
              data-testid="category-attributes-input"
            />
            <p class="text-xs text-muted-foreground">
              {{
                isSubcategory ? t("operations.categories.attributesSubHelp") : t("operations.categories.attributesHelp")
              }}
            </p>
            <p v-if="attributesError" class="text-xs text-destructive" role="alert">{{ attributesError }}</p>
          </div>
          <div class="grid gap-2">
            <Label for="category-order">{{ t("operations.categories.order") }}</Label>
            <Input id="category-order" v-model.number="form.ordre" type="number" min="0" class="w-28" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" :disabled="pending" @click="formMode = null">{{
              t("operations.categories.cancel")
            }}</Button>
            <Button type="submit" :disabled="pending || !formValid" data-testid="category-submit">{{
              t("operations.categories.save")
            }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="Boolean(deleting)" @update:open="value => (value ? null : (deleting = null))">
      <AlertDialogContent data-testid="category-delete-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{{
            t("operations.categories.deleteTitle", { name: deleting?.nom ?? "" })
          }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t("operations.categories.deleteHelp") }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="pending">{{ t("operations.categories.cancel") }}</AlertDialogCancel>
          <Button variant="destructive" :disabled="pending" @click="confirmDelete">{{
            t("operations.categories.delete")
          }}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
