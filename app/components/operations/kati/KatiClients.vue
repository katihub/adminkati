<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the balances, a client sheet and its adjustment dialog
import type { KatiOperation, KatiOperationType } from "@/types/api/kati"
import { refDebounced } from "@vueuse/core"
import { computed, reactive, ref } from "vue"
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
import { Textarea } from "@/components/ui/textarea"
import { useKatiClients, useKatiClientSheet, useKatiMutations } from "@/composables/useKati"
import { useToastAction } from "@/composables/useToastAction"

const { t, locale } = useI18n()
const search = ref("")
const debounced = refDebounced(search, 300)
const clients = useKatiClients(debounced)
const selectedId = ref<string | null>(null)
const sheet = useKatiClientSheet(selectedId)
const { adjust } = useKatiMutations()
const run = useToastAction()
const adjusting = ref(false)
const form = reactive({ sens: "credit" as "credit" | "retrait", points: 0, motif: "", cle: "" })
const number = computed(() => new Intl.NumberFormat(locale.value))
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }))
const TYPE_KEYS: Record<KatiOperationType, string> = {
  attribution: "operations.kati.types.attribution",
  liberation: "operations.kati.types.liberation",
  reservation: "operations.kati.types.reservation",
  utilisation: "operations.kati.types.utilisation",
  annulation: "operations.kati.types.annulation",
  expiration: "operations.kati.types.expiration",
  correction: "operations.kati.types.correction",
  ajustement: "operations.kati.types.ajustement",
  transfert: "operations.kati.types.transfert",
  restitution: "operations.kati.types.restitution",
}
const formError = computed(() => {
  if (!Number.isInteger(form.points) || form.points <= 0) return t("operations.kati.clients.pointsInvalid")
  if (form.motif.trim().length < 5) return t("operations.kati.clients.reasonRequired")
  if (form.sens === "retrait" && sheet.data.value && form.points > sheet.data.value.soldes.disponible)
    return t("operations.kati.clients.overdraft")
  return ""
})

/** What an operation changed for the client: available first, pending otherwise. */
function delta(operation: KatiOperation) {
  return operation.type === "liberation"
    ? operation.disponible
    : operation.disponible + operation.enAttente + operation.reserve
}

function openAdjust() {
  // A fresh key per form: a double click on "Save" adjusts once.
  Object.assign(form, { sens: "credit", points: 0, motif: "", cle: crypto.randomUUID() })
  adjusting.value = true
}

async function submitAdjust() {
  const clientId = selectedId.value
  if (!clientId || formError.value) return
  const done = await run(
    () =>
      adjust.mutateAsync({
        clientId,
        body: { sens: form.sens, points: form.points, motif: form.motif.trim(), cle: form.cle },
      }),
    t(form.sens === "credit" ? "operations.kati.clients.credited" : "operations.kati.clients.debited"),
  )
  if (done) adjusting.value = false
}
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" data-testid="kati-clients">
    <section class="space-y-3">
      <label class="relative block">
        <Icon
          name="ph:magnifying-glass"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="search"
          class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          :placeholder="t('operations.kati.clients.search')"
          :aria-label="t('operations.kati.clients.search')"
          data-testid="kati-clients-search"
        />
      </label>
      <div v-if="clients.isPending.value" class="space-y-2">
        <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="clients.error.value" :error="clients.error.value" @retry="clients.refetch()" />
      <EmptyStateCard
        v-else-if="!clients.data.value?.length"
        icon="ph:coins"
        :text="t('operations.kati.clients.empty')"
      />
      <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
        <li v-for="client in clients.data.value" :key="client.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/60"
            :class="selectedId === client.id ? 'bg-muted' : ''"
            :data-testid="`kati-client-${client.id}`"
            @click="selectedId = client.id"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium">{{ client.nom ?? client.courriel ?? client.id }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{
                client.telephone ?? client.courriel
              }}</span>
            </span>
            <span class="shrink-0 text-right text-sm">
              <strong>{{ number.format(client.disponible) }}</strong>
              <span v-if="client.enAttente" class="block text-xs text-muted-foreground">{{
                t("operations.kati.clients.pendingShort", { points: number.format(client.enAttente) })
              }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section class="rounded-lg border border-border bg-card p-5" data-testid="kati-client-sheet">
      <EmptyStateCard v-if="!selectedId" icon="ph:user-circle" :text="t('operations.kati.clients.select')" />
      <div v-else-if="sheet.isPending.value" class="h-40 animate-pulse rounded-lg bg-muted" />
      <ApiErrorCard v-else-if="sheet.error.value" :error="sheet.error.value" @retry="sheet.refetch()" />
      <template v-else-if="sheet.data.value">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="font-heading text-lg font-semibold">
              {{ sheet.data.value.client.nom ?? sheet.data.value.client.courriel }}
            </h3>
            <p class="text-xs text-muted-foreground">
              {{ sheet.data.value.client.telephone }} · {{ sheet.data.value.client.courriel }}
              <template v-if="sheet.data.value.code"> · {{ sheet.data.value.code }}</template>
            </p>
          </div>
          <Button size="sm" data-testid="kati-adjust" @click="openAdjust"
            ><Icon name="ph:plus-minus" /> {{ t("operations.kati.clients.adjust") }}</Button
          >
        </div>
        <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-muted-foreground">{{ t("operations.kati.overview.available") }}</dt>
            <dd class="text-lg font-semibold" data-testid="kati-sheet-available">
              {{ number.format(sheet.data.value.soldes.disponible) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t("operations.kati.overview.pending") }}</dt>
            <dd class="font-medium">{{ number.format(sheet.data.value.soldes.enAttente) }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t("operations.kati.overview.reserved") }}</dt>
            <dd class="font-medium">{{ number.format(sheet.data.value.soldes.reserve) }}</dd>
          </div>
        </dl>
        <p class="mt-4 text-sm">
          <template v-if="sheet.data.value.parrain">
            {{
              t("operations.kati.clients.sponsoredBy", {
                name: sheet.data.value.parrain.parrain.profil?.nom ?? sheet.data.value.parrain.parrain.id,
                date: date.format(new Date(sheet.data.value.parrain.attacheLe)),
              })
            }}
            <Badge v-if="sheet.data.value.parrain.statut === 'revoque'" variant="outline">{{
              t("operations.kati.sponsorships.revoked")
            }}</Badge>
          </template>
          <template v-else>{{ t("operations.kati.clients.noSponsor") }}</template>
          · {{ t("operations.kati.clients.godchildren", { count: sheet.data.value.filleuls.length }) }}
        </p>
        <h4 class="mt-5 text-sm font-medium">{{ t("operations.kati.clients.history") }}</h4>
        <p v-if="!sheet.data.value.historique.elements.length" class="mt-2 text-sm text-muted-foreground">
          {{ t("operations.kati.clients.noHistory") }}
        </p>
        <ul v-else class="mt-2 divide-y divide-border text-sm" data-testid="kati-sheet-history">
          <li
            v-for="operation in sheet.data.value.historique.elements"
            :key="operation.id"
            class="flex justify-between gap-3 py-2"
          >
            <span class="min-w-0">
              <span class="block font-medium">{{ t(TYPE_KEYS[operation.type]) }}</span>
              <span class="block truncate text-xs text-muted-foreground"
                >{{ date.format(new Date(operation.creeLe)) }} · {{ operation.libelle }}</span
              >
            </span>
            <strong :class="delta(operation) < 0 ? 'text-destructive' : ''">{{
              number.format(delta(operation))
            }}</strong>
          </li>
        </ul>
      </template>
    </section>

    <Dialog :open="adjusting" @update:open="value => (value ? null : (adjusting = false))">
      <DialogContent data-testid="kati-adjust-form">
        <DialogHeader>
          <DialogTitle>{{ t("operations.kati.clients.adjustTitle") }}</DialogTitle>
          <DialogDescription>{{ t("operations.kati.clients.adjustHelp") }}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="submitAdjust">
          <div class="grid gap-2">
            <Label for="kati-adjust-direction">{{ t("operations.kati.clients.direction") }}</Label>
            <NativeSelect id="kati-adjust-direction" v-model="form.sens" data-testid="kati-adjust-direction">
              <NativeSelectOption value="credit">{{ t("operations.kati.clients.credit") }}</NativeSelectOption>
              <NativeSelectOption value="retrait">{{ t("operations.kati.clients.debit") }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid gap-2">
            <Label for="kati-adjust-points">{{ t("operations.kati.clients.points") }}</Label>
            <Input
              id="kati-adjust-points"
              v-model.number="form.points"
              type="number"
              min="1"
              data-testid="kati-adjust-points"
            />
          </div>
          <div class="grid gap-2">
            <Label for="kati-adjust-reason">{{ t("operations.kati.clients.reason") }}</Label>
            <Textarea
              id="kati-adjust-reason"
              v-model="form.motif"
              rows="3"
              maxlength="250"
              data-testid="kati-adjust-reason"
            />
          </div>
          <p v-if="formError" class="text-xs text-destructive" role="alert">{{ formError }}</p>
          <DialogFooter>
            <Button type="button" variant="outline" :disabled="adjust.isPending.value" @click="adjusting = false">{{
              t("operations.kati.cancel")
            }}</Button>
            <Button
              type="submit"
              :disabled="adjust.isPending.value || Boolean(formError)"
              data-testid="kati-adjust-submit"
              >{{ t("operations.kati.clients.save") }}</Button
            >
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
