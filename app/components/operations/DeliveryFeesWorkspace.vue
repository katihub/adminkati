<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the grid, its form dialog and its delete confirmation
import type { DeliveryFee, DeliveryMode } from "@/composables/useDeliveryFees"
import { computed, reactive, ref } from "vue"
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
import { useDeliveryFeeMutations, useDeliveryFees } from "@/composables/useDeliveryFees"
import { useToastAction } from "@/composables/useToastAction"

const { t, locale } = useI18n()
const query = useDeliveryFees()
const mutations = useDeliveryFeeMutations()
const run = useToastAction()
const editing = ref<DeliveryFee | null>(null)
const creating = ref(false)
const formOpen = computed(() => creating.value || Boolean(editing.value))
const deleting = ref<DeliveryFee | null>(null)
const form = reactive({ ville: "", mode: "katihub" as DeliveryMode, montant: 0, seuil: "" })
const pending = computed(() => Object.values(mutations).some(mutation => mutation.isPending.value))
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const cities = computed(() => {
  const groups = new Map<string, DeliveryFee[]>()
  for (const fee of query.data.value ?? []) groups.set(fee.ville, [...(groups.get(fee.ville) ?? []), fee])
  return [...groups.entries()].map(([ville, fees]) => ({ ville, fees }))
})
const threshold = computed(() => (form.seuil.trim() ? Number(form.seuil) : null))
const formError = computed(() => {
  if (creating.value && form.ville.trim().length < 2) return t("operations.deliveryFees.cityRequired")
  if (!Number.isInteger(form.montant) || form.montant < 0) return t("operations.deliveryFees.amountInvalid")
  if (threshold.value !== null && (!Number.isInteger(threshold.value) || threshold.value < 1))
    return t("operations.deliveryFees.thresholdInvalid")
  return ""
})

const MODE_LABELS: Record<DeliveryMode, string> = {
  katihub: "operations.deliveryFees.modeKatihub",
  vendeur: "operations.deliveryFees.modeShop",
  agence: "operations.deliveryFees.modeAgency",
}
const MODES = Object.keys(MODE_LABELS) as DeliveryMode[]

function modeLabel(mode: DeliveryMode) {
  return t(MODE_LABELS[mode] ?? mode)
}

function openNew(ville = "") {
  Object.assign(form, { ville, mode: "katihub", montant: 0, seuil: "" })
  editing.value = null
  creating.value = true
}

function openEdit(fee: DeliveryFee) {
  Object.assign(form, {
    ville: fee.ville,
    mode: fee.mode,
    montant: fee.montantFcfa,
    seuil: fee.gratuitDesFcfa ? String(fee.gratuitDesFcfa) : "",
  })
  creating.value = false
  editing.value = fee
}

async function submit() {
  const current = editing.value
  if ((!creating.value && !current) || formError.value) return
  const done =
    creating.value || !current
      ? await run(
          () =>
            mutations.create.mutateAsync({
              ville: form.ville.trim(),
              mode: form.mode,
              montantFcfa: form.montant,
              ...(threshold.value ? { gratuitDesFcfa: threshold.value } : {}),
            }),
          t("operations.deliveryFees.created"),
        )
      : await run(
          () =>
            mutations.update.mutateAsync({
              id: current.id,
              body: { montantFcfa: form.montant, gratuitDesFcfa: threshold.value },
            }),
          t("operations.deliveryFees.updated"),
        )
  if (done) closeForm()
}

function closeForm() {
  creating.value = false
  editing.value = null
}

function toggle(fee: DeliveryFee) {
  void run(
    () => mutations.update.mutateAsync({ id: fee.id, body: { actif: !fee.actif } }),
    t(fee.actif ? "operations.deliveryFees.deactivated" : "operations.deliveryFees.activated"),
  )
}

async function confirmDelete() {
  const fee = deleting.value
  if (!fee) return
  if (await run(() => mutations.remove.mutateAsync(fee.id), t("operations.deliveryFees.deleted"))) deleting.value = null
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="delivery-fees-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10"
    >
      <p class="max-w-3xl text-sm text-muted-foreground">{{ t("operations.deliveryFees.help") }}</p>
      <Button size="sm" data-testid="delivery-fee-create" @click="openNew()"
        ><Icon name="ph:plus" /> {{ t("operations.deliveryFees.create") }}</Button
      >
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard v-else-if="!cities.length" icon="ph:truck" :text="t('operations.deliveryFees.empty')" />
      <ul v-else class="grid gap-3 lg:grid-cols-2">
        <li
          v-for="city in cities"
          :key="city.ville"
          class="rounded-lg border border-border bg-card"
          :data-testid="`delivery-city-${city.ville}`"
        >
          <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 class="font-heading font-semibold">{{ city.ville }}</h3>
            <Button
              v-if="city.fees.length < MODES.length"
              size="sm"
              variant="ghost"
              :disabled="pending"
              @click="openNew(city.ville)"
              ><Icon name="ph:plus" /> {{ t("operations.deliveryFees.addMode") }}</Button
            >
          </div>
          <ul>
            <li
              v-for="fee in city.fees"
              :key="fee.id"
              class="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              :data-testid="`delivery-fee-${fee.id}`"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium">{{ modeLabel(fee.mode) }}</span>
                  <Badge v-if="!fee.actif" variant="outline">{{ t("operations.deliveryFees.inactive") }}</Badge>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  <strong class="text-foreground">{{ money.format(fee.montantFcfa) }}</strong>
                  <template v-if="fee.gratuitDesFcfa">
                    ·
                    {{ t("operations.deliveryFees.freeFrom", { amount: money.format(fee.gratuitDesFcfa) }) }}</template
                  >
                </p>
              </div>
              <div class="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" :disabled="pending" @click="openEdit(fee)">{{
                  t("operations.deliveryFees.edit")
                }}</Button>
                <Button size="sm" variant="ghost" :disabled="pending" @click="toggle(fee)">{{
                  fee.actif ? t("operations.deliveryFees.deactivate") : t("operations.deliveryFees.activate")
                }}</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-destructive"
                  :disabled="pending"
                  @click="deleting = fee"
                  >{{ t("operations.deliveryFees.delete") }}</Button
                >
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <Dialog :open="formOpen" @update:open="value => (value ? null : closeForm())">
      <DialogContent data-testid="delivery-fee-form">
        <DialogHeader>
          <DialogTitle>{{
            creating
              ? t("operations.deliveryFees.createTitle")
              : t("operations.deliveryFees.editTitle", { city: form.ville, mode: modeLabel(form.mode) })
          }}</DialogTitle>
          <DialogDescription>{{ t("operations.deliveryFees.formHelp") }}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="submit">
          <template v-if="creating">
            <div class="grid gap-2">
              <Label for="delivery-fee-city">{{ t("operations.deliveryFees.city") }}</Label>
              <Input id="delivery-fee-city" v-model="form.ville" maxlength="60" data-testid="delivery-fee-city" />
            </div>
            <div class="grid gap-2">
              <Label for="delivery-fee-mode">{{ t("operations.deliveryFees.mode") }}</Label>
              <NativeSelect id="delivery-fee-mode" v-model="form.mode" data-testid="delivery-fee-mode">
                <NativeSelectOption v-for="mode in MODES" :key="mode" :value="mode">{{
                  modeLabel(mode)
                }}</NativeSelectOption>
              </NativeSelect>
            </div>
          </template>
          <div class="grid gap-2">
            <Label for="delivery-fee-amount">{{ t("operations.deliveryFees.amount") }}</Label>
            <Input
              id="delivery-fee-amount"
              v-model.number="form.montant"
              type="number"
              min="0"
              class="w-40"
              data-testid="delivery-fee-amount"
            />
          </div>
          <div class="grid gap-2">
            <Label for="delivery-fee-threshold">{{ t("operations.deliveryFees.threshold") }}</Label>
            <Input
              id="delivery-fee-threshold"
              v-model="form.seuil"
              type="number"
              min="1"
              class="w-40"
              data-testid="delivery-fee-threshold"
            />
            <p class="text-xs text-muted-foreground">{{ t("operations.deliveryFees.thresholdHelp") }}</p>
          </div>
          <p v-if="formError" class="text-xs text-destructive" role="alert">{{ formError }}</p>
          <DialogFooter>
            <Button type="button" variant="outline" :disabled="pending" @click="closeForm()">{{
              t("operations.deliveryFees.cancel")
            }}</Button>
            <Button type="submit" :disabled="pending || Boolean(formError)" data-testid="delivery-fee-submit">{{
              t("operations.deliveryFees.save")
            }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="Boolean(deleting)" @update:open="value => (value ? null : (deleting = null))">
      <AlertDialogContent data-testid="delivery-fee-delete-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{{
            t("operations.deliveryFees.deleteTitle", {
              city: deleting?.ville ?? "",
              mode: deleting ? modeLabel(deleting.mode) : "",
            })
          }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t("operations.deliveryFees.deleteHelp") }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="pending">{{ t("operations.deliveryFees.cancel") }}</AlertDialogCancel>
          <Button variant="destructive" :disabled="pending" @click="confirmDelete">{{
            t("operations.deliveryFees.delete")
          }}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
