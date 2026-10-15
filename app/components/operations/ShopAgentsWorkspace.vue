<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: a filter and one row per agent with its verification form
import type { ShopAgent, ShopAgentFilter } from "@/types/api/shop-agents"
import { computed, reactive, ref } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useShopAgentMutations, useShopAgents } from "@/composables/useShopAgents"
import { useToastAction } from "@/composables/useToastAction"
import { formatMontant } from "@/utils/money"

/* THE SHOPS' DELIVERY AGENTS. A shop adds its couriers and counter employees
   from its seller space; KatiHub verifies each one before it can be assigned a
   parcel, and sets the cash it may hold (what it collects on delivery or at the
   counter). Without an agent ceiling, the city's ceiling applies; without
   either, the agent cannot be assigned a parcel with cash to collect. */
const { t, locale } = useI18n()
const filter = ref<ShopAgentFilter>("a_verifier")
const query = useShopAgents(filter)
const { verify } = useShopAgentMutations()
const run = useToastAction()
const ceilings = reactive<Record<string, number | undefined>>({})
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }))

function ceilingOf(agent: ShopAgent) {
  const value = ceilings[agent.id]
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10_000_000 ? value : undefined
}

function ceilingInvalid(agent: ShopAgent) {
  const value = ceilings[agent.id]
  return value !== undefined && ceilingOf(agent) === undefined
}

function stateOf(agent: ShopAgent) {
  if (!agent.actif) return t("operations.shopAgents.removed")
  return agent.verifieLe
    ? t("operations.shopAgents.verifiedOn", { date: date.value.format(new Date(agent.verifieLe)) })
    : t("operations.shopAgents.pending")
}

function ceilingLabel(agent: ShopAgent) {
  return agent.plafondEspecesFcfa === null
    ? t("operations.shopAgents.cityCeiling")
    : t("operations.shopAgents.ceiling", { amount: formatMontant(agent.plafondEspecesFcfa, locale.value).exact })
}

function verifyAgent(agent: ShopAgent) {
  if (ceilingInvalid(agent)) return
  void run(
    () => verify.mutateAsync({ id: agent.id, plafondEspecesFcfa: ceilingOf(agent) }),
    t("operations.shopAgents.verified", { name: agent.nom }),
  )
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="shop-agents-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10"
    >
      <p class="max-w-3xl text-sm text-muted-foreground">{{ t("operations.shopAgents.help") }}</p>
      <NativeSelect
        v-model="filter"
        class="w-56"
        :aria-label="t('operations.shopAgents.filter')"
        data-testid="shop-agents-filter"
      >
        <NativeSelectOption value="a_verifier">{{ t("operations.shopAgents.toVerify") }}</NativeSelectOption>
        <NativeSelectOption value="tous">{{ t("operations.shopAgents.all") }}</NativeSelectOption>
      </NativeSelect>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard
        v-else-if="!query.data.value?.length"
        icon="ph:user-check"
        :text="filter === 'a_verifier' ? t('operations.shopAgents.emptyPending') : t('operations.shopAgents.empty')"
      />
      <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
        <li
          v-for="agent in query.data.value"
          :key="agent.id"
          class="flex flex-wrap items-center gap-3 px-4 py-3"
          :data-testid="`shop-agent-${agent.id}`"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium">{{ agent.nom }}</span>
              <span class="text-xs text-muted-foreground">{{ agent.telephone }}</span>
              <Badge :variant="agent.verifieLe && agent.actif ? 'default' : 'outline'">{{ stateOf(agent) }}</Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ agent.boutique?.nom ?? t("operations.shopAgents.noShop") }}
              <template v-if="agent.boutique?.ville"> · {{ agent.boutique.ville }}</template>
              <template v-if="agent.verifieLe"> · {{ ceilingLabel(agent) }}</template>
            </p>
          </div>
          <form
            v-if="agent.actif && !agent.verifieLe"
            class="flex flex-wrap items-center gap-2"
            @submit.prevent="verifyAgent(agent)"
          >
            <Input
              v-model.number="ceilings[agent.id]"
              type="number"
              min="0"
              step="any"
              class="w-44"
              :placeholder="t('operations.shopAgents.ceilingPlaceholder')"
              :aria-label="t('operations.shopAgents.ceilingFor', { name: agent.nom })"
              :data-testid="`shop-agent-ceiling-${agent.id}`"
            />
            <Button
              type="submit"
              size="sm"
              :disabled="verify.isPending.value || ceilingInvalid(agent)"
              :data-testid="`shop-agent-verify-${agent.id}`"
              >{{ t("operations.shopAgents.verify") }}</Button
            >
            <p v-if="ceilingInvalid(agent)" class="w-full text-xs text-destructive" role="alert">
              {{ t("operations.shopAgents.ceilingInvalid") }}
            </p>
          </form>
        </li>
      </ul>
    </div>
  </div>
</template>
