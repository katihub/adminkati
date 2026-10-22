<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the insurance settings and one installation row per category
import type { MarketplaceCategory, MarketplaceSubcategory } from "@/types/api/marketplace-categories"
import { computed, reactive, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMarketplaceCategories } from "@/composables/useMarketplaceCategories"
import { useOrderServicesMutations, useOrderServicesSettings } from "@/composables/useOrderServices"
import { useToastAction } from "@/composables/useToastAction"

/* KATIHUB'S PAID ORDER SERVICES. The KATI insurance is a share of the products
   only, unchecked by default at checkout and ticked by the customer who wants it; the
   direction sets its rate or suspends it. Installation is a fixed price per
   order for each category where KatiHub offers it; a sub-category without its
   own setting follows its category. */
type Node = MarketplaceCategory | MarketplaceSubcategory

const { t, locale } = useI18n()
const settings = useOrderServicesSettings()
const categories = useMarketplaceCategories()
const { updateSettings, updateInstallation } = useOrderServicesMutations()
const run = useToastAction()
const insurance = reactive({ active: true, percent: 5 })
const prices = ref<Record<string, number | undefined>>({})
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const nodes = computed(() =>
  (categories.data.value ?? []).flatMap(category => [
    { node: category as Node, depth: 0 },
    ...category.sousCategories.map(sub => ({ node: sub as Node, depth: 1 })),
  ]),
)
const percentError = computed(() =>
  !Number.isFinite(insurance.percent) || insurance.percent < 0 || insurance.percent > 30
    ? t("operations.orderServices.rateInvalid")
    : "",
)

watch(
  () => settings.data.value,
  value => {
    if (value) Object.assign(insurance, { active: value.assuranceActive, percent: value.assuranceTauxBps / 100 })
  },
  { immediate: true },
)
watch(
  () => categories.data.value,
  () => {
    prices.value = Object.fromEntries(nodes.value.map(({ node }) => [node.id, node.installationPrixFcfa ?? undefined]))
  },
  { immediate: true },
)

function saveInsurance() {
  if (percentError.value) return
  void run(
    () =>
      updateSettings.mutateAsync({
        assuranceActive: insurance.active,
        assuranceTauxBps: Math.round(insurance.percent * 100),
      }),
    t("operations.orderServices.insuranceSaved"),
  )
}

function priceOf(node: Node) {
  const price = prices.value[node.id]
  return typeof price === "number" && Number.isInteger(price) && price > 0 ? price : null
}

function saveInstallation(node: Node, active: boolean) {
  const price = priceOf(node)
  if (active && !price) return
  void run(
    () =>
      updateInstallation.mutateAsync({
        id: node.id,
        body: { installationActive: active, installationPrixFcfa: price },
      }),
    t(active ? "operations.orderServices.installationOn" : "operations.orderServices.installationOff"),
  )
}
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10"
    data-testid="order-services-workspace"
  >
    <section class="rounded-lg border border-border bg-card p-5">
      <h3 class="font-heading font-semibold">{{ t("operations.orderServices.insuranceTitle") }}</h3>
      <p class="mt-1 max-w-3xl text-sm text-muted-foreground">{{ t("operations.orderServices.insuranceHelp") }}</p>
      <div v-if="settings.isPending.value" class="mt-4 h-16 animate-pulse rounded-lg bg-muted" />
      <ApiErrorCard v-else-if="settings.error.value" :error="settings.error.value" @retry="settings.refetch()" />
      <form v-else class="mt-4 flex flex-wrap items-end gap-4" @submit.prevent="saveInsurance">
        <label class="flex items-center gap-2 text-sm">
          <input v-model="insurance.active" type="checkbox" class="size-4" data-testid="insurance-active" />
          {{ t("operations.orderServices.insuranceActive") }}
        </label>
        <div class="grid gap-1.5">
          <Label for="insurance-rate">{{ t("operations.orderServices.rate") }}</Label>
          <Input
            id="insurance-rate"
            v-model.number="insurance.percent"
            type="number"
            min="0"
            max="30"
            step="any"
            class="w-28"
            data-testid="insurance-rate"
          />
        </div>
        <Button
          type="submit"
          :disabled="updateSettings.isPending.value || Boolean(percentError)"
          data-testid="insurance-save"
          >{{ t("operations.orderServices.save") }}</Button
        >
        <p v-if="percentError" class="w-full text-xs text-destructive" role="alert">{{ percentError }}</p>
      </form>
    </section>

    <section class="mt-4 rounded-lg border border-border bg-card p-5">
      <h3 class="font-heading font-semibold">{{ t("operations.orderServices.installationTitle") }}</h3>
      <p class="mt-1 max-w-3xl text-sm text-muted-foreground">{{ t("operations.orderServices.installationHelp") }}</p>
      <div v-if="categories.isPending.value" class="mt-4 space-y-2">
        <div v-for="n in 4" :key="n" class="h-12 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="categories.error.value" :error="categories.error.value" @retry="categories.refetch()" />
      <ul v-else class="mt-4 divide-y divide-border">
        <li
          v-for="{ node, depth } in nodes"
          :key="node.id"
          class="flex flex-wrap items-center gap-3 py-3"
          :class="depth ? 'pl-8' : ''"
          :data-testid="`installation-${node.slug}`"
        >
          <div class="min-w-0 flex-1">
            <span class="text-sm font-medium">{{ node.nom }}</span>
            <Badge v-if="node.installationActive" class="ml-2">{{
              t("operations.orderServices.offered", { price: money.format(node.installationPrixFcfa ?? 0) })
            }}</Badge>
          </div>
          <Input
            v-model.number="prices[node.id]"
            type="number"
            min="1"
            class="w-32"
            :aria-label="t('operations.orderServices.price', { name: node.nom })"
            :data-testid="`installation-price-${node.slug}`"
          />
          <Button
            v-if="!node.installationActive"
            size="sm"
            :disabled="updateInstallation.isPending.value || !priceOf(node)"
            :data-testid="`installation-on-${node.slug}`"
            @click="saveInstallation(node, true)"
            >{{ t("operations.orderServices.offer") }}</Button
          >
          <template v-else>
            <Button
              size="sm"
              variant="outline"
              :disabled="updateInstallation.isPending.value || !priceOf(node)"
              @click="saveInstallation(node, true)"
              >{{ t("operations.orderServices.updatePrice") }}</Button
            >
            <Button
              size="sm"
              variant="ghost"
              class="text-destructive"
              :disabled="updateInstallation.isPending.value"
              :data-testid="`installation-off-${node.slug}`"
              @click="saveInstallation(node, false)"
              >{{ t("operations.orderServices.stop") }}</Button
            >
          </template>
        </li>
      </ul>
    </section>
  </div>
</template>
