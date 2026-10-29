<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the refused lines, their refund dialog and payout states
import type { RefusedLine, RefusedLineFilter, RefundStatus } from "@/types/api/marketplace-catalogue-quality"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useRefusedLineRefunds, useRefusedLines } from "@/composables/useCatalogueQuality"
import { useToastAction } from "@/composables/useToastAction"

/* LINES REFUSED BY SHOPS WITHOUT STOCK TRACKING. The shop did not have the
   item: the line left the order, the delivery collects less, and the part of
   the deposit that no longer covers any product is owed to the customer.
   The direction pays it back by a Kratospay payout, as for a return. */
const { t, locale } = useI18n()
const filter = ref<RefusedLineFilter>("a_rembourser")
const query = useRefusedLines(filter)
const { refund, reconcile } = useRefusedLineRefunds()
const run = useToastAction()
const refunding = ref<RefusedLine | null>(null)
const phone = ref("")
const pending = computed(() => refund.isPending.value || reconcile.isPending.value)
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }))
const phoneError = computed(() =>
  phone.value.trim() && !/^(?:\+?237)?6\d{8}$/.test(phone.value.replace(/\s/g, ""))
    ? t("operations.refusedLines.phoneInvalid")
    : "",
)
const STATUS_KEYS: Record<RefundStatus, string> = {
  prepare: "operations.refusedLines.statusPrepared",
  soumis: "operations.refusedLines.statusSubmitted",
  reussi: "operations.refusedLines.statusPaid",
  echec: "operations.refusedLines.statusFailed",
  verification_requise: "operations.refusedLines.statusCheck",
}

function canRefund(line: RefusedLine) {
  const status = line.remboursementPsp?.statut
  return !line.rembourseLe && line.remboursementDuFcfa >= 100 && (!status || status === "prepare" || status === "echec")
}

function canReconcile(line: RefusedLine) {
  const status = line.remboursementPsp?.statut
  return !line.rembourseLe && (status === "soumis" || status === "verification_requise")
}

function openRefund(line: RefusedLine) {
  phone.value = ""
  refunding.value = line
}

async function confirmRefund() {
  const line = refunding.value
  if (!line || phoneError.value) return
  const telephone = phone.value.replace(/\s/g, "") || undefined
  if (await run(() => refund.mutateAsync({ id: line.id, telephone }), t("operations.refusedLines.refundSent")))
    refunding.value = null
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="refused-lines-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10"
    >
      <p class="max-w-3xl text-sm text-muted-foreground">{{ t("operations.refusedLines.help") }}</p>
      <NativeSelect
        v-model="filter"
        :aria-label="t('operations.refusedLines.filter')"
        data-testid="refused-lines-filter"
      >
        <NativeSelectOption value="a_rembourser">{{ t("operations.refusedLines.toRefund") }}</NativeSelectOption>
        <NativeSelectOption value="tous">{{ t("operations.refusedLines.all") }}</NativeSelectOption>
      </NativeSelect>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 3" :key="n" class="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard
        v-else-if="!query.data.value?.length"
        icon="ph:receipt-x"
        :text="t('operations.refusedLines.empty')"
      />
      <ul v-else class="grid gap-3">
        <li
          v-for="line in query.data.value"
          :key="line.id"
          class="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-4"
          :data-testid="`refused-line-${line.id}`"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-heading font-semibold">{{ line.ligne.produitNomCapture }}</h3>
              <Badge v-if="line.rembourseLe" data-testid="refused-line-paid">{{
                t("operations.refusedLines.statusPaid")
              }}</Badge>
              <Badge v-else-if="line.remboursementPsp" variant="outline">{{
                t(STATUS_KEYS[line.remboursementPsp.statut])
              }}</Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ line.ligne.sousCommande.commande.reference }} · {{ line.ligne.sousCommande.boutique.nom }} ·
              {{ t("operations.refusedLines.quantity", { count: line.quantite }) }} ·
              {{ money.format(line.montantFcfa) }} · {{ date.format(new Date(line.creeLe)) }}
            </p>
            <p class="mt-1 text-sm">
              {{ t("operations.refusedLines.owed") }} :
              <strong data-testid="refused-line-owed">{{ money.format(line.remboursementDuFcfa) }}</strong>
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ t("operations.refusedLines.reason") }} : {{ line.motif }}
            </p>
            <p v-if="line.remboursementPsp?.raisonEchec" class="mt-1 text-xs text-destructive">
              {{ line.remboursementPsp.raisonEchec }}
            </p>
          </div>
          <div class="flex flex-wrap gap-1">
            <Button
              v-if="canRefund(line)"
              size="sm"
              :disabled="pending"
              data-testid="refused-line-refund"
              @click="openRefund(line)"
              >{{ t("operations.refusedLines.refund") }}</Button
            >
            <Button
              v-if="canReconcile(line)"
              size="sm"
              variant="outline"
              :disabled="pending"
              data-testid="refused-line-reconcile"
              @click="run(() => reconcile.mutateAsync(line.id), t('operations.refusedLines.reconciled'))"
              >{{ t("operations.refusedLines.reconcile") }}</Button
            >
          </div>
        </li>
      </ul>
    </div>

    <Dialog :open="Boolean(refunding)" @update:open="value => (value ? null : (refunding = null))">
      <DialogContent data-testid="refused-line-refund-form">
        <DialogHeader>
          <DialogTitle>{{ t("operations.refusedLines.refundTitle") }}</DialogTitle>
          <DialogDescription>{{
            refunding
              ? t("operations.refusedLines.refundHelp", {
                  amount: money.format(refunding.remboursementDuFcfa),
                  order: refunding.ligne.sousCommande.commande.reference,
                })
              : ""
          }}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="confirmRefund">
          <div class="grid gap-2">
            <Label for="refused-line-phone">{{ t("operations.refusedLines.phone") }}</Label>
            <Input id="refused-line-phone" v-model="phone" inputmode="tel" data-testid="refused-line-phone" />
            <p class="text-xs text-muted-foreground">{{ t("operations.refusedLines.phoneHelp") }}</p>
            <p v-if="phoneError" class="text-xs text-destructive" role="alert">{{ phoneError }}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" :disabled="pending" @click="refunding = null">{{
              t("operations.refusedLines.cancel")
            }}</Button>
            <Button type="submit" :disabled="pending || Boolean(phoneError)" data-testid="refused-line-refund-submit">{{
              t("operations.refusedLines.confirmRefund")
            }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
