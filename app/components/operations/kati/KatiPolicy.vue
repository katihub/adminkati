<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the active rules, the draft form, its approval and the history
import type { KatiPolicy, KatiRules } from "@/types/api/kati"
import { computed, reactive, ref, watch } from "vue"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useKatiMutations, useKatiPolicies } from "@/composables/useKati"
import { useToastAction } from "@/composables/useToastAction"

/* The rates are shown and typed as percentages; the API stores basis points. */
type Form = Omit<KatiRules, "gainClientBps" | "commissionParrainBps" | "depensePlafondBps"> & {
  gainPercent: number
  commissionPercent: number
  spendCapPercent: number
}
type NumberField = Exclude<keyof Form, "assiette" | "rechargeActive">

const { t, locale } = useI18n()
const query = useKatiPolicies()
const { saveDraft, approve } = useKatiMutations()
const run = useToastAction()
const confirming = ref(false)
const active = computed(() => query.data.value?.find(policy => policy.statut === "active") ?? null)
const draft = computed(() => query.data.value?.find(policy => policy.statut === "brouillon") ?? null)
const history = computed(() => (query.data.value ?? []).filter(policy => policy.statut !== "brouillon"))
const form = reactive<Form>({
  katiParFcfa: 10,
  gainPercent: 1,
  commissionPercent: 0.5,
  assiette: "produits",
  liberationApresLivraisonJours: 5,
  parrainageDureeMois: 12,
  plafondCommissionsMensuelKati: 200000,
  depenseMinimumKati: 10000,
  spendCapPercent: 50,
  expirationGainsMois: 12,
  rechargeActive: false,
  rechargeMinimumFcfa: 1000,
  rechargeMaximumFcfa: 500000,
})
const FIELDS: Array<{ key: NumberField; step: string }> = [
  { key: "gainPercent", step: "any" },
  { key: "commissionPercent", step: "any" },
  { key: "katiParFcfa", step: "1" },
  { key: "liberationApresLivraisonJours", step: "1" },
  { key: "parrainageDureeMois", step: "1" },
  { key: "plafondCommissionsMensuelKati", step: "1" },
  { key: "depenseMinimumKati", step: "1" },
  { key: "spendCapPercent", step: "any" },
  { key: "expirationGainsMois", step: "1" },
  { key: "rechargeMinimumFcfa", step: "1" },
  { key: "rechargeMaximumFcfa", step: "1" },
]
const percent = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }))
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }))

function load(rules: KatiRules) {
  const { gainClientBps, commissionParrainBps, depensePlafondBps, ...rest } = rules
  Object.assign(form, rest, {
    gainPercent: gainClientBps / 100,
    commissionPercent: commissionParrainBps / 100,
    spendCapPercent: depensePlafondBps / 100,
  })
}
// The form starts from the draft if one is waiting, otherwise from the rules in force.
watch(
  () => draft.value ?? active.value,
  policy => {
    if (policy) load(policy.regles)
  },
  { immediate: true },
)

function toRules(): KatiRules {
  const { gainPercent, commissionPercent, spendCapPercent, ...rest } = form
  return {
    ...rest,
    gainClientBps: Math.round(gainPercent * 100),
    commissionParrainBps: Math.round(commissionPercent * 100),
    depensePlafondBps: Math.round(spendCapPercent * 100),
  }
}

function summary(policy: KatiPolicy) {
  return t("operations.kati.policy.summary", {
    gain: percent.value.format(policy.regles.gainClientBps / 100),
    commission: percent.value.format(policy.regles.commissionParrainBps / 100),
    rate: policy.regles.katiParFcfa,
  })
}

function save() {
  void run(() => saveDraft.mutateAsync(toRules()), t("operations.kati.policy.draftSaved"))
}

async function confirmApproval() {
  const id = draft.value?.id
  if (!id) return
  if (await run(() => approve.mutateAsync(id), t("operations.kati.policy.approved"))) confirming.value = false
}
</script>

<template>
  <div class="space-y-4" data-testid="kati-policy">
    <div v-if="query.isPending.value" class="h-48 animate-pulse rounded-lg bg-muted" />
    <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <template v-else>
      <section v-if="active" class="rounded-lg border border-border bg-card p-5" data-testid="kati-policy-active">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-heading font-semibold">
            {{ t("operations.kati.policy.active", { version: active.version }) }}
          </h3>
          <Badge>{{ t("operations.kati.policy.inForce") }}</Badge>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">{{ summary(active) }}</p>
      </section>

      <section class="rounded-lg border border-border bg-card p-5">
        <h3 class="font-heading font-semibold">
          {{
            draft
              ? t("operations.kati.policy.draftTitle", { version: draft.version })
              : t("operations.kati.policy.newDraft")
          }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">{{ t("operations.kati.policy.help") }}</p>
        <form class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" @submit.prevent="save">
          <div v-for="field in FIELDS" :key="field.key" class="grid gap-1.5">
            <Label :for="`kati-rule-${field.key}`">{{ t(`operations.kati.policy.fields.${field.key}`) }}</Label>
            <Input
              :id="`kati-rule-${field.key}`"
              v-model.number="form[field.key]"
              type="number"
              min="0"
              :step="field.step"
              :data-testid="`kati-rule-${field.key}`"
            />
          </div>
          <div class="grid gap-1.5">
            <Label for="kati-rule-base">{{ t("operations.kati.policy.fields.assiette") }}</Label>
            <NativeSelect id="kati-rule-base" v-model="form.assiette" data-testid="kati-rule-assiette">
              <NativeSelectOption value="produits">{{ t("operations.kati.policy.productsOnly") }}</NativeSelectOption>
              <NativeSelectOption value="produits_et_livraison">{{
                t("operations.kati.policy.productsAndDelivery")
              }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="form.rechargeActive" type="checkbox" class="size-4" data-testid="kati-rule-recharge" />
            {{ t("operations.kati.policy.fields.rechargeActive") }}
          </label>
          <div class="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" :disabled="saveDraft.isPending.value" data-testid="kati-policy-save">{{
              t("operations.kati.policy.saveDraft")
            }}</Button>
            <Button
              v-if="draft"
              type="button"
              variant="outline"
              :disabled="approve.isPending.value"
              data-testid="kati-policy-approve"
              @click="confirming = true"
              >{{ t("operations.kati.policy.approve") }}</Button
            >
          </div>
        </form>
      </section>

      <section v-if="history.length" class="rounded-lg border border-border bg-card p-5">
        <h3 class="font-heading font-semibold">{{ t("operations.kati.policy.history") }}</h3>
        <ul class="mt-2 divide-y divide-border text-sm" data-testid="kati-policy-history">
          <li v-for="policy in history" :key="policy.id" class="flex flex-wrap justify-between gap-2 py-2">
            <span>{{ t("operations.kati.policy.version", { version: policy.version }) }} · {{ summary(policy) }}</span>
            <span class="text-xs text-muted-foreground">{{
              policy.effectiveLe ? date.format(new Date(policy.effectiveLe)) : "—"
            }}</span>
          </li>
        </ul>
      </section>
    </template>

    <AlertDialog :open="confirming" @update:open="value => (confirming = value)">
      <AlertDialogContent data-testid="kati-policy-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{{
            t("operations.kati.policy.confirmTitle", { version: draft?.version ?? 0 })
          }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t("operations.kati.policy.confirmHelp") }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="approve.isPending.value">{{ t("operations.kati.cancel") }}</AlertDialogCancel>
          <Button
            :disabled="approve.isPending.value"
            data-testid="kati-policy-confirm-approve"
            @click="confirmApproval"
            >{{ t("operations.kati.policy.approve") }}</Button
          >
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
