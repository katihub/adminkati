<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the published offers, their badge and its note dialog
import type { PublishedOffer, PublishedOfferFilter } from "@/types/api/marketplace-catalogue-quality"
import { refDebounced } from "@vueuse/core"
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
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useOfferVerification, usePublishedOffers } from "@/composables/useCatalogueQuality"
import { useToastAction } from "@/composables/useToastAction"

/* THE "VÉRIFIÉ PAR KATIHUB" BADGE. KatiHub received one shop's item and tested
   it: the badge goes on that shop's offer only, never on the product for every
   shop. The direction sets it with a note on what was checked, or removes it. */
const { t, locale } = useI18n()
const search = ref("")
const filter = ref<PublishedOfferFilter>("toutes")
const debouncedSearch = refDebounced(search, 300)
const query = usePublishedOffers(debouncedSearch, filter)
const verification = useOfferVerification()
const run = useToastAction()
const verifying = ref<PublishedOffer | null>(null)
const note = ref("")
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }))
const noteError = computed(() => {
  const length = note.value.trim().length
  return length > 0 && (length < 3 || length > 300) ? t("operations.verifiedOffers.noteInvalid") : ""
})

function title(offer: PublishedOffer) {
  return offer.libelleVariante ? `${offer.produit.nom} — ${offer.libelleVariante}` : offer.produit.nom
}

function openVerify(offer: PublishedOffer) {
  note.value = offer.noteVerification ?? ""
  verifying.value = offer
}

async function save(offer: PublishedOffer, verifiee: boolean) {
  const trimmed = note.value.trim()
  const done = await run(
    () =>
      verification.mutateAsync({
        id: offer.id,
        body: verifiee && trimmed ? { verifiee, note: trimmed } : { verifiee },
      }),
    t(verifiee ? "operations.verifiedOffers.verified" : "operations.verifiedOffers.removed"),
  )
  if (done) verifying.value = null
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="verified-offers-workspace">
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
          :placeholder="t('operations.verifiedOffers.search')"
          :aria-label="t('operations.verifiedOffers.search')"
          data-testid="verified-offers-search"
        />
      </label>
      <NativeSelect
        v-model="filter"
        :aria-label="t('operations.verifiedOffers.filter')"
        data-testid="verified-offers-filter"
      >
        <NativeSelectOption value="toutes">{{ t("operations.verifiedOffers.all") }}</NativeSelectOption>
        <NativeSelectOption value="verifiees">{{ t("operations.verifiedOffers.onlyVerified") }}</NativeSelectOption>
      </NativeSelect>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <p class="mb-4 max-w-3xl text-sm text-muted-foreground">{{ t("operations.verifiedOffers.help") }}</p>
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard
        v-else-if="!query.data.value?.length"
        icon="ph:seal-check"
        :text="t('operations.verifiedOffers.empty')"
      />
      <ul v-else class="grid gap-3 lg:grid-cols-2">
        <li
          v-for="offer in query.data.value"
          :key="offer.id"
          class="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-4"
          :data-testid="`published-offer-${offer.id}`"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-heading font-semibold">{{ title(offer) }}</h3>
              <Badge v-if="offer.verifieParKatiLe" data-testid="offer-verified-badge">
                <Icon name="ph:seal-check" /> {{ t("operations.verifiedOffers.badge") }}
              </Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ offer.boutique.nom }} · {{ offer.referenceVendeur }} ·
              {{ offer.prixFcfa === null ? "—" : money.format(offer.prixFcfa) }}
              <template v-if="offer.quantiteMinimale > 1">
                · {{ t("operations.verifiedOffers.minimum", { count: offer.quantiteMinimale }) }}</template
              >
            </p>
            <p v-if="offer.verifieParKatiLe" class="mt-1 text-xs text-muted-foreground">
              {{ t("operations.verifiedOffers.since", { date: date.format(new Date(offer.verifieParKatiLe)) }) }}
              <template v-if="offer.noteVerification"> · {{ offer.noteVerification }}</template>
            </p>
          </div>
          <div class="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" :disabled="verification.isPending.value" @click="openVerify(offer)">{{
              offer.verifieParKatiLe ? t("operations.verifiedOffers.editNote") : t("operations.verifiedOffers.verify")
            }}</Button>
            <Button
              v-if="offer.verifieParKatiLe"
              size="sm"
              variant="ghost"
              class="text-destructive"
              :disabled="verification.isPending.value"
              data-testid="offer-unverify"
              @click="save(offer, false)"
              >{{ t("operations.verifiedOffers.remove") }}</Button
            >
          </div>
        </li>
      </ul>
    </div>

    <Dialog :open="Boolean(verifying)" @update:open="value => (value ? null : (verifying = null))">
      <DialogContent data-testid="offer-verify-form">
        <DialogHeader>
          <DialogTitle>{{ t("operations.verifiedOffers.dialogTitle") }}</DialogTitle>
          <DialogDescription>{{
            verifying
              ? t("operations.verifiedOffers.dialogHelp", { offer: title(verifying), shop: verifying.boutique.nom })
              : ""
          }}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="verifying && save(verifying, true)">
          <div class="grid gap-2">
            <Label for="offer-verify-note">{{ t("operations.verifiedOffers.note") }}</Label>
            <Textarea id="offer-verify-note" v-model="note" rows="3" maxlength="300" data-testid="offer-verify-note" />
            <p class="text-xs text-muted-foreground">{{ t("operations.verifiedOffers.noteHelp") }}</p>
            <p v-if="noteError" class="text-xs text-destructive" role="alert">{{ noteError }}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              :disabled="verification.isPending.value"
              @click="verifying = null"
              >{{ t("operations.verifiedOffers.cancel") }}</Button
            >
            <Button
              type="submit"
              :disabled="verification.isPending.value || Boolean(noteError)"
              data-testid="offer-verify-submit"
              >{{ t("operations.verifiedOffers.confirm") }}</Button
            >
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
