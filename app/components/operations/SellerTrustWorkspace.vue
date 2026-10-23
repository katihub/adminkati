<script setup lang="ts">
// fallow-ignore-file complexity code-duplication -- operations workspaces intentionally share a declarative responsive master-detail frame
import type { SellerTrustFilters } from "@/types/api/marketplace-operations"
import { computed, ref } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSellerTrustDetail, useSellerTrustList } from "@/composables/useMarketplaceOperations"
import { routeQueryString } from "@/utils/route-query"

const route = useRoute()
const { locale, t } = useI18n()
const search = ref("")
const status = ref<string | undefined>()
const explicitId = computed(() => routeQueryString(route.query.vendeur) ?? null)
const filters = computed<SellerTrustFilters>(() => ({
  ...(search.value.trim() ? { q: search.value.trim() } : {}),
  ...(status.value ? { statut: status.value } : {}),
  taille: 40,
}))
const listQuery = useSellerTrustList(filters)
const effectiveId = computed(() => explicitId.value ?? listQuery.data.value?.elements[0]?.id ?? null)
const detailQuery = useSellerTrustDetail(effectiveId)
const sanctionOpen = ref(false)
const dateFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }),
)

function selectSeller(id: string) {
  void navigateTo({ path: route.path, query: { tab: "seller-trust", vendeur: id } })
}

function clearSelection() {
  void navigateTo({ path: route.path, query: { tab: "seller-trust" } })
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="operations-seller-trust-workspace">
    <div class="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label class="relative min-w-0 flex-1 sm:max-w-md">
          <Icon
            name="ph:magnifying-glass"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="search" class="pl-9 text-sm" :placeholder="t('operations.trust.search')" />
        </label>
        <select v-model="status" class="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option :value="undefined">{{ t("operations.trust.allStatuses") }}</option>
          <option value="actif">{{ t("operations.trust.status.actif") }}</option>
          <option value="sous_surveillance">{{ t("operations.trust.status.sous_surveillance") }}</option>
          <option value="suspendu">{{ t("operations.trust.status.suspendu") }}</option>
          <option value="exclu">{{ t("operations.trust.status.exclu") }}</option>
        </select>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 border-t border-border bg-card lg:grid-cols-[300px_1fr]">
      <aside
        class="h-full overflow-hidden border-r border-border bg-card"
        :class="explicitId ? 'hidden lg:block' : 'block'"
      >
        <div class="border-b border-border px-4 py-3">
          <h2 class="font-heading text-sm font-semibold">{{ t("operations.trust.queue") }}</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ t("operations.trust.count", { count: listQuery.data.value?.total ?? 0 }) }}
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
            {{ listQuery.error.value ? t("operations.common.loadError") : t("operations.trust.empty") }}
          </div>
          <button
            v-for="seller in listQuery.data.value?.elements ?? []"
            v-else
            :key="seller.id"
            type="button"
            class="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
            :class="
              seller.id === effectiveId ? 'border-l-4 border-l-primary bg-muted' : 'border-l-4 border-l-transparent'
            "
            @click="selectSeller(seller.id)"
          >
            <span class="flex w-full items-start justify-between gap-2"
              ><strong class="truncate text-sm font-medium">{{ seller.nomLegal }}</strong
              ><Badge class="border-0 px-2 py-0 text-[10px]">{{
                t(`operations.trust.status.${seller.statut}`, seller.statut)
              }}</Badge></span
            >
            <span class="truncate text-xs text-muted-foreground">{{
              seller.boutiques.map(item => item.nom).join(", ")
            }}</span>
            <span v-if="seller.reputations[0]" class="text-[11px] text-muted-foreground">{{
              t("operations.trust.risk", { score: seller.reputations[0].scoreRisque })
            }}</span>
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
          :text="t('operations.trust.select')"
        />
        <div v-else class="min-h-full">
          <header
            class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4 sm:p-5"
          >
            <div>
              <button
                type="button"
                class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground lg:hidden"
                @click="clearSelection"
              >
                <Icon name="ph:arrow-left" /> {{ t("operations.common.back") }}
              </button>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-heading text-lg font-semibold">{{ detailQuery.data.value.nomLegal }}</h2>
                <Badge class="border-0 px-2.5 py-0.5 text-xs">{{
                  t(`operations.trust.status.${detailQuery.data.value.statut}`, detailQuery.data.value.statut)
                }}</Badge>
              </div>
              <p class="mt-0.5 text-sm text-muted-foreground">
                {{ detailQuery.data.value.boutiques.map(item => item.nom).join(", ") }}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              :disabled="!detailQuery.data.value.capacites.sanctionner"
              data-testid="seller-sanction-open"
              @click="sanctionOpen = true"
              ><Icon name="ph:warning" /> {{ t("operations.trust.sanction") }}</Button
            >
            <OperationsTrustSanctionDialog
              v-model:open="sanctionOpen"
              :seller-id="detailQuery.data.value.id"
              :seller-name="detailQuery.data.value.nomLegal"
            />
          </header>

          <div class="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div class="space-y-4">
              <section class="rounded-lg border border-border bg-card p-4">
                <h3 class="font-heading text-base font-semibold">{{ t("operations.trust.summary") }}</h3>
                <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.trust.verification") }}</dt>
                    <dd class="font-medium">{{ detailQuery.data.value.statutVerification }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.trust.riskLabel") }}</dt>
                    <dd class="font-medium">{{ detailQuery.data.value.reputations[0]?.scoreRisque ?? "—" }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.trust.disputeRate") }}</dt>
                    <dd class="font-medium">
                      {{
                        detailQuery.data.value.reputations[0]
                          ? `${(detailQuery.data.value.reputations[0].tauxLitigeBps / 100).toFixed(2)} %`
                          : "—"
                      }}
                    </dd>
                  </div>
                </dl>
              </section>
              <section class="rounded-lg border border-border bg-card p-4">
                <h3 class="font-heading text-base font-semibold">{{ t("operations.trust.history") }}</h3>
                <div
                  v-if="!detailQuery.data.value.sanctions.length"
                  class="py-8 text-center text-sm text-muted-foreground"
                >
                  {{ t("operations.trust.noSanctions") }}
                </div>
                <ol v-else class="mt-3 divide-y divide-border">
                  <li v-for="sanction in detailQuery.data.value.sanctions" :key="sanction.id" class="py-3 text-sm">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <strong>{{ t(`operations.trust.sanctionType.${sanction.type}`, sanction.type) }}</strong
                      ><Badge class="border-0 px-2 py-0 text-[10px]">{{
                        t(`operations.trust.sanctionStatus.${sanction.statut}`, sanction.statut)
                      }}</Badge>
                    </div>
                    <p class="mt-1 text-muted-foreground">{{ sanction.motif }}</p>
                    <time class="mt-1 block text-xs text-muted-foreground">{{
                      dateFormatter.format(new Date(sanction.commenceLe))
                    }}</time>
                  </li>
                </ol>
              </section>
              <OperationsTrustCatalogueExport
                v-if="detailQuery.data.value.boutiques.length"
                :shops="detailQuery.data.value.boutiques"
              />
            </div>
            <OperationsTrustDecisionPanel :seller="detailQuery.data.value" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
