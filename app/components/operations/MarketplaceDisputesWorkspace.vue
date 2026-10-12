<script setup lang="ts">
// fallow-ignore-file complexity -- declarative dispute workspace with explicit workflow states
import type { MarketplaceReturnFilters, MarketplaceReturnStatus } from "@/types/api/marketplace-operations"
import { computed, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useMarketplaceReturn,
  useMarketplaceReturnMutations,
  useMarketplaceReturns,
} from "@/composables/useMarketplaceOperations"
import { routeQueryString } from "@/utils/route-query"

const route = useRoute()
const { locale, t } = useI18n()
const search = ref("")
const status = ref<MarketplaceReturnStatus | undefined>()
const reimbursementReference = ref("")
const explicitId = computed(() => routeQueryString(route.query.retour) ?? null)
const filters = computed<MarketplaceReturnFilters>(() => ({
  ...(search.value.trim() ? { q: search.value.trim() } : {}),
  ...(status.value ? { statut: status.value } : {}),
  taille: 40,
}))
const listQuery = useMarketplaceReturns(filters)
const effectiveId = computed(() => explicitId.value ?? listQuery.data.value?.elements[0]?.id ?? null)
const detailQuery = useMarketplaceReturn(effectiveId)
const { reimburse, receive } = useMarketplaceReturnMutations()

watch(effectiveId, () => {
  reimbursementReference.value = ""
})

const dateFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }),
)
const dateTimeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
)
const moneyFormatter = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)

const statusTone: Record<MarketplaceReturnStatus, string> = {
  demande: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  autorise: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  refuse: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  en_transit: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  recu: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  rembourse: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
}

function selectReturn(id: string) {
  void navigateTo({ path: route.path, query: { tab: "marketplace-disputes", retour: id } })
}

function clearSelection() {
  void navigateTo({ path: route.path, query: { tab: "marketplace-disputes" } })
}

function reimburseReturn() {
  const id = effectiveId.value
  const referenceExterne = reimbursementReference.value.trim()
  if (!id || !referenceExterne) return
  reimburse.mutate({ id, referenceExterne })
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="operations-marketplace-disputes-workspace">
    <div class="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label class="relative min-w-0 flex-1 sm:max-w-md">
          <Icon
            name="ph:magnifying-glass"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="search" class="pl-9 text-sm" :placeholder="t('operations.disputes.search')" />
        </label>
        <select v-model="status" class="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option :value="undefined">{{ t("operations.disputes.allStatuses") }}</option>
          <option v-for="value in Object.keys(statusTone)" :key="value" :value="value">
            {{ t(`operations.disputes.status.${value}`) }}
          </option>
        </select>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 border-t border-border bg-card lg:grid-cols-[300px_1fr]">
      <aside
        class="h-full overflow-hidden border-r border-border bg-card"
        :class="explicitId ? 'hidden lg:block' : 'block'"
        data-testid="marketplace-disputes-sidebar"
      >
        <div class="border-b border-border px-4 py-3">
          <h2 class="font-heading text-sm font-semibold">{{ t("operations.disputes.queue") }}</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ t("operations.disputes.count", { count: listQuery.data.value?.total ?? 0 }) }}
          </p>
        </div>
        <ScrollArea class="h-[calc(100%-61px)]">
          <div v-if="listQuery.isPending.value" class="space-y-2 p-3">
            <div v-for="n in 7" :key="n" class="h-20 animate-pulse rounded-md bg-muted" />
          </div>
          <div
            v-else-if="listQuery.error.value || !listQuery.data.value?.elements.length"
            class="p-6 text-center text-sm text-muted-foreground"
          >
            {{ listQuery.error.value ? t("operations.common.loadError") : t("operations.disputes.empty") }}
          </div>
          <button
            v-for="item in listQuery.data.value?.elements ?? []"
            v-else
            :key="item.id"
            type="button"
            class="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
            :class="
              item.id === effectiveId ? 'border-l-4 border-l-primary bg-muted' : 'border-l-4 border-l-transparent'
            "
            @click="selectReturn(item.id)"
          >
            <span class="flex w-full items-start justify-between gap-2">
              <strong class="truncate text-sm font-medium">{{ item.demande.reference }}</strong>
              <Badge class="shrink-0 border-0 px-2 py-0 text-[10px] font-medium" :class="statusTone[item.statut]">
                {{ t(`operations.disputes.status.${item.statut}`) }}
              </Badge>
            </span>
            <span class="truncate text-xs text-muted-foreground">
              {{
                item.demande.client.profil?.nom || item.demande.client.courriel || t("operations.common.unknownClient")
              }}
              · {{ item.demande.boutique.nom }}
            </span>
            <span class="text-[11px] text-muted-foreground">{{ dateFormatter.format(new Date(item.creeLe)) }}</span>
          </button>
        </ScrollArea>
      </aside>

      <section class="h-full overflow-y-auto bg-muted/70" :class="explicitId ? 'block' : 'hidden lg:block'">
        <div
          v-if="detailQuery.isPending.value"
          class="flex h-full items-center justify-center text-sm text-muted-foreground"
        >
          {{ t("operations.common.loading") }}
        </div>
        <ApiErrorCard
          v-else-if="detailQuery.error.value"
          class="m-6"
          :error="detailQuery.error.value"
          @retry="() => void detailQuery.refetch()"
        />
        <EmptyStateCard
          v-else-if="!detailQuery.data.value"
          class="m-6"
          icon="ph:cursor-click"
          :text="t('operations.disputes.select')"
        />
        <div v-else class="min-h-full">
          <header
            class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4 sm:p-5"
          >
            <div class="min-w-0">
              <button
                type="button"
                class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground lg:hidden"
                @click="clearSelection"
              >
                <Icon name="ph:arrow-left" /> {{ t("operations.common.back") }}
              </button>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-heading text-lg font-semibold">{{ detailQuery.data.value.demande.reference }}</h2>
                <Badge class="border-0 px-2.5 py-0.5 text-xs" :class="statusTone[detailQuery.data.value.statut]">
                  {{ t(`operations.disputes.status.${detailQuery.data.value.statut}`) }}
                </Badge>
              </div>
              <p class="mt-0.5 text-sm text-muted-foreground">{{ detailQuery.data.value.demande.boutique.nom }}</p>
            </div>
            <Button
              v-if="detailQuery.data.value.capacites.recevoir"
              size="sm"
              :disabled="receive.isPending.value"
              @click="receive.mutate(detailQuery.data.value.id)"
            >
              {{ t("operations.disputes.receive") }}
            </Button>
          </header>

          <div class="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div class="space-y-4">
              <section class="rounded-lg border border-border bg-card p-4">
                <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.summary") }}</h3>
                <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.disputes.order") }}</dt>
                    <dd class="font-medium">{{ detailQuery.data.value.demande.commande.reference }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.disputes.shipment") }}</dt>
                    <dd class="font-medium">{{ detailQuery.data.value.demande.expedition?.reference ?? "—" }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.disputes.refundable") }}</dt>
                    <dd class="font-medium">
                      {{ moneyFormatter.format(detailQuery.data.value.montantRemboursableFcfa) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.disputes.reason") }}</dt>
                    <dd class="font-medium">{{ detailQuery.data.value.motifClient }}</dd>
                  </div>
                </dl>
              </section>
              <section class="overflow-hidden rounded-lg border border-border bg-card">
                <h3 class="px-4 pt-4 font-heading text-base font-semibold">{{ t("operations.disputes.items") }}</h3>
                <div class="overflow-x-auto p-4">
                  <table class="w-full min-w-[520px] text-left text-sm">
                    <thead class="border-b border-border text-xs text-muted-foreground">
                      <tr>
                        <th class="pb-2">{{ t("operations.disputes.item") }}</th>
                        <th class="pb-2">{{ t("operations.disputes.sku") }}</th>
                        <th class="pb-2">{{ t("operations.disputes.quantity") }}</th>
                        <th class="pb-2 text-right">{{ t("operations.disputes.unitPrice") }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="pt-3 font-medium">{{ detailQuery.data.value.ligne.produitNomCapture }}</td>
                        <td class="pt-3">{{ detailQuery.data.value.ligne.referenceVendeurCapture }}</td>
                        <td class="pt-3">{{ detailQuery.data.value.quantite }}</td>
                        <td class="pt-3 text-right">
                          {{ moneyFormatter.format(detailQuery.data.value.ligne.prixUnitaireFcfa) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
              <section class="rounded-lg border border-border bg-card p-4">
                <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.history") }}</h3>
                <ol class="mt-4 space-y-4 border-l border-border pl-5">
                  <li
                    v-for="event in detailQuery.data.value.demande.evenements"
                    :key="event.id"
                    class="relative text-sm"
                  >
                    <span class="absolute -left-[25px] top-1.5 size-2 rounded-full bg-primary" />
                    <p class="font-medium">
                      {{ t(`operations.disputes.requestStatus.${event.versStatut}`, event.versStatut) }}
                    </p>
                    <p v-if="event.motif" class="text-muted-foreground">{{ event.motif }}</p>
                    <time class="text-xs text-muted-foreground">{{
                      dateTimeFormatter.format(new Date(event.creeLe))
                    }}</time>
                  </li>
                </ol>
              </section>
            </div>
            <section class="h-fit rounded-lg border border-border bg-card p-4 xl:sticky xl:top-24">
              <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.decision") }}</h3>
              <label class="mt-4 block text-sm font-medium" for="refund-reference">{{
                t("operations.disputes.refundReference")
              }}</label>
              <Input
                id="refund-reference"
                v-model="reimbursementReference"
                class="mt-2"
                :disabled="!detailQuery.data.value.capacites.rembourser"
              />
              <Button
                class="mt-3 w-full"
                :disabled="
                  !detailQuery.data.value.capacites.rembourser ||
                  !reimbursementReference.trim() ||
                  reimburse.isPending.value
                "
                @click="reimburseReturn"
              >
                <Icon name="ph:shield-check" /> {{ t("operations.disputes.reimburse") }}
              </Button>
              <Button class="mt-2 w-full" variant="outline" :disabled="!detailQuery.data.value.capacites.arbitrer">
                <Icon name="ph:scales" /> {{ t("operations.disputes.arbitrate") }}
              </Button>
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
