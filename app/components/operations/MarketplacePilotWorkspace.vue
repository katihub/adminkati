<script setup lang="ts">
// fallow-ignore-file complexity -- declarative admin workspace with mutually exclusive loading, empty and decision states
import type { PilotAction, PilotDecision, PilotStatus } from "@/types/api/marketplace-pilot"
import { computed, ref, watch } from "vue"
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
import { Button } from "@/components/ui/button"
import {
  useMarketplacePilotMeasures,
  useMarketplacePilotMutations,
  useMarketplacePilots,
} from "@/composables/useMarketplacePilots"
import { formatIndicatorValue, pilotIndicators } from "@/utils/pilot-measures"

const STATUS_CLASSES: Record<PilotStatus, string> = {
  brouillon: "bg-zinc-100 text-zinc-700",
  pret: "bg-sky-100 text-sky-800",
  en_cours: "bg-emerald-100 text-emerald-800",
  suspendu: "bg-amber-100 text-amber-800",
  termine: "bg-zinc-200 text-zinc-700",
}
const DECISION_CLASSES: Record<PilotDecision, string> = {
  go: "border-emerald-200 bg-emerald-50 text-emerald-800",
  prolonger: "border-amber-200 bg-amber-50 text-amber-800",
  bloque: "border-red-200 bg-red-50 text-red-800",
}
const ACTIONS: Record<PilotStatus, PilotAction[]> = {
  brouillon: ["demarrer"],
  pret: ["demarrer"],
  en_cours: ["suspendre", "terminer"],
  suspendu: ["demarrer", "terminer"],
  termine: [],
}

const { t, locale } = useI18n()
const pilots = useMarketplacePilots()
const selectedId = ref<string | null>(null)
const measures = useMarketplacePilotMeasures(selectedId)
const { transition, evaluate } = useMarketplacePilotMutations()
// The dialog closes itself before its action handler runs: the pending action must outlive the open state.
const confirmOpen = ref(false)
const confirming = ref<PilotAction | null>(null)

watch(
  () => pilots.data.value,
  list => {
    if (!list?.length) selectedId.value = null
    else if (!list.some(pilot => pilot.id === selectedId.value)) selectedId.value = list[0]!.id
  },
  { immediate: true },
)

const selected = computed(() => pilots.data.value?.find(pilot => pilot.id === selectedId.value) ?? null)
const lastEvaluation = computed(() => selected.value?.evaluations[0] ?? null)
const indicators = computed(() =>
  measures.data.value && selected.value
    ? pilotIndicators(measures.data.value.mesures, selected.value.politiqueGoNoGo)
    : [],
)
const proofs = computed(() => {
  const m = measures.data.value?.mesures
  return m
    ? [
        { key: "returnsTested", ok: m.retoursTestes },
        { key: "refundsTested", ok: m.remboursementsTestes },
        { key: "logisticsAuditable", ok: m.responsabilitesLogistiquesAuditables },
      ]
    : []
})

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString(locale.value, { dateStyle: "medium", timeStyle: "short" }) : "—"
}

function requestAction(action: PilotAction) {
  confirming.value = action
  confirmOpen.value = true
}

function confirmAction() {
  const action = confirming.value
  if (!selected.value || !action) return
  transition.mutate({ id: selected.value.id, action }, { onSettled: () => (confirmOpen.value = false) })
}

function runEvaluation() {
  if (!selected.value) return
  evaluate.mutate({ id: selected.value.id, cleIdempotence: `admin:${selected.value.id}:${crypto.randomUUID()}` })
}
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60"
    data-testid="operations-marketplace-pilot-workspace"
  >
    <div class="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section class="min-w-0 space-y-4">
        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {{ t("operations.pilot.eyebrow") }}
          </p>
          <h2 class="mt-1 font-heading text-xl font-semibold">{{ t("operations.pilot.title") }}</h2>
          <p class="mt-2 max-w-3xl text-sm text-muted-foreground">{{ t("operations.pilot.explanation") }}</p>
        </div>

        <ApiErrorCard v-if="pilots.error.value" :error="pilots.error.value" @retry="() => void pilots.refetch()" />
        <div v-else-if="pilots.isPending.value" class="h-32 animate-pulse rounded-xl bg-muted" />
        <EmptyStateCard
          v-else-if="!pilots.data.value?.length"
          icon="ph:flag-banner"
          :text="t('operations.pilot.empty.title')"
          :hint="t('operations.pilot.empty.description')"
        />
        <template v-else>
          <div class="flex gap-2 overflow-x-auto pb-1" role="tablist" :aria-label="t('operations.pilot.listLabel')">
            <button
              v-for="pilot in pilots.data.value"
              :key="pilot.id"
              type="button"
              role="tab"
              :aria-selected="pilot.id === selectedId"
              class="min-h-11 shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition"
              :class="pilot.id === selectedId ? 'border-primary bg-card shadow-sm' : 'bg-card/60 hover:bg-card'"
              :data-testid="`marketplace-pilot-${pilot.id}`"
              @click="selectedId = pilot.id"
            >
              <span class="block font-medium">{{ pilot.nom }}</span>
              <span class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {{ pilot.ville.nom }}
                <span class="rounded-full px-2 py-0.5 font-semibold" :class="STATUS_CLASSES[pilot.statut]">
                  {{ t(`operations.pilot.status.${pilot.statut}`) }}
                </span>
              </span>
            </button>
          </div>

          <article v-if="selected" class="rounded-xl border bg-card p-5 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <h3 class="font-heading text-lg font-semibold">{{ selected.nom }}</h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{
                    t("operations.pilot.period", {
                      start: formatDate(selected.commenceLe),
                      end: selected.termineLe ? formatDate(selected.termineLe) : t("operations.pilot.ongoing"),
                    })
                  }}
                  ·
                  {{ t("operations.pilot.scope", { count: selected.perimetre.boutiqueIds?.length ?? 0 }) }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <Button
                  v-for="action in ACTIONS[selected.statut]"
                  :key="action"
                  size="sm"
                  :variant="action === 'demarrer' ? 'default' : 'outline'"
                  :disabled="transition.isPending.value"
                  :data-testid="`marketplace-pilot-action-${action}`"
                  @click="requestAction(action)"
                  >{{ t(`operations.pilot.actions.${action}`) }}</Button
                >
                <Button
                  size="sm"
                  variant="secondary"
                  :disabled="!selected.commenceLe || evaluate.isPending.value"
                  data-testid="marketplace-pilot-evaluate"
                  @click="runEvaluation"
                  ><Icon name="ph:scales" />{{
                    evaluate.isPending.value ? t("operations.pilot.evaluating") : t("operations.pilot.evaluate")
                  }}</Button
                >
              </div>
            </div>
            <p v-if="transition.error.value || evaluate.error.value" class="mt-3 text-sm text-destructive" role="alert">
              {{ t("operations.pilot.actionError") }}
            </p>

            <ApiErrorCard
              v-if="measures.error.value"
              class="mt-4"
              :error="measures.error.value"
              @retry="() => void measures.refetch()"
            />
            <div v-else-if="measures.isPending.value" class="mt-4 h-40 animate-pulse rounded-lg bg-muted" />
            <template v-else>
              <p v-if="!selected.commenceLe" class="mt-4 text-sm text-muted-foreground">
                {{ t("operations.pilot.notStarted") }}
              </p>
              <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="item in indicators"
                  :key="item.key"
                  class="rounded-lg border p-3"
                  :class="item.ok ? 'border-border' : 'border-amber-300 bg-amber-50/60'"
                  :data-testid="`marketplace-pilot-indicator-${item.key}`"
                >
                  <dt class="text-xs text-muted-foreground">{{ t(`operations.pilot.indicators.${item.key}`) }}</dt>
                  <dd class="mt-1 flex items-baseline justify-between gap-2">
                    <span class="font-heading text-lg font-semibold">{{
                      formatIndicatorValue(item.kind, item.value, locale)
                    }}</span>
                    <span class="text-xs text-muted-foreground">
                      {{
                        t(`operations.pilot.threshold.${item.comparison}`, {
                          value: formatIndicatorValue(item.kind, item.threshold, locale),
                        })
                      }}
                    </span>
                  </dd>
                </div>
              </dl>
              <ul class="mt-3 flex flex-wrap gap-2">
                <li
                  v-for="proof in proofs"
                  :key="proof.key"
                  class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                  :class="proof.ok ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'"
                >
                  <Icon :name="proof.ok ? 'ph:check-circle-fill' : 'ph:x-circle'" />{{
                    t(`operations.pilot.proofs.${proof.key}`)
                  }}
                </li>
              </ul>
            </template>

            <section
              v-if="lastEvaluation"
              class="mt-5 rounded-lg border p-4"
              :class="DECISION_CLASSES[lastEvaluation.decision]"
              data-testid="marketplace-pilot-last-evaluation"
            >
              <p class="text-sm font-semibold">
                {{
                  t("operations.pilot.lastEvaluation", {
                    decision: t(`operations.pilot.decision.${lastEvaluation.decision}`),
                    date: formatDate(lastEvaluation.creeLe),
                  })
                }}
              </p>
              <ul class="mt-2 space-y-1 text-sm">
                <li v-for="item in lastEvaluation.bloquants" :key="item" class="flex gap-2">
                  <Icon name="ph:prohibit" class="mt-0.5 shrink-0" />{{ item }}
                </li>
                <li v-for="item in lastEvaluation.observations" :key="item" class="flex gap-2">
                  <Icon name="ph:hourglass-medium" class="mt-0.5 shrink-0" />{{ item }}
                </li>
              </ul>
            </section>
          </article>
        </template>
      </section>

      <OperationsMarketplacePilotCreateForm @created="id => (selectedId = id)" />
    </div>

    <AlertDialog :open="confirmOpen" @update:open="confirmOpen = $event">
      <AlertDialogContent data-testid="marketplace-pilot-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{{
            confirming ? t(`operations.pilot.confirm.${confirming}.title`, { name: selected?.nom ?? "" }) : ""
          }}</AlertDialogTitle>
          <AlertDialogDescription>{{
            confirming ? t(`operations.pilot.confirm.${confirming}.description`) : ""
          }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="transition.isPending.value">{{
            t("operations.pilot.cancel")
          }}</AlertDialogCancel>
          <AlertDialogAction
            :disabled="transition.isPending.value"
            data-testid="marketplace-pilot-confirm-action"
            @click="confirmAction"
            >{{ confirming ? t(`operations.pilot.actions.${confirming}`) : "" }}</AlertDialogAction
          >
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
