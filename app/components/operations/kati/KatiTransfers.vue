<script setup lang="ts">
import type { KatiTransferFilters, KatiTransferParty } from "@/types/api/kati"
import { refDebounced } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { useKatiTransfers } from "@/composables/useKati"

/* EVERY KATI TRANSFER BETWEEN CLIENTS. A transfer moves available KATI from one
   client to another; the direction reads them all here, searches either side
   and narrows the dates. The totals cover every match, not only this page. */
const { t, locale } = useI18n()
const search = ref("")
const debounced = refDebounced(search, 300)
const from = ref("")
const to = ref("")
const page = ref(1)
const filters = computed<KatiTransferFilters>(() => ({
  ...(debounced.value.trim() ? { recherche: debounced.value.trim() } : {}),
  ...(from.value ? { du: from.value } : {}),
  ...(to.value ? { au: to.value } : {}),
  page: page.value,
}))
const transfers = useKatiTransfers(filters)
const number = computed(() => new Intl.NumberFormat(locale.value))
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }))

watch([debounced, from, to], () => {
  page.value = 1
})

const party = (person: KatiTransferParty) => person.nom ?? person.courriel ?? person.telephone ?? person.id
const contact = (person: KatiTransferParty) => [person.telephone, person.courriel].filter(Boolean).join(" · ")
</script>

<template>
  <section class="space-y-4" data-testid="kati-transfers">
    <div class="flex flex-wrap items-end gap-3">
      <label class="relative min-w-60 flex-1">
        <Icon
          name="ph:magnifying-glass"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="search"
          class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          :placeholder="t('operations.kati.transfers.search')"
          :aria-label="t('operations.kati.transfers.search')"
          data-testid="kati-transfers-search"
        />
      </label>
      <label class="grid gap-1 text-xs text-muted-foreground"
        >{{ t("operations.kati.transfers.from") }}
        <input
          v-model="from"
          type="date"
          :max="to || undefined"
          class="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
      /></label>
      <label class="grid gap-1 text-xs text-muted-foreground"
        >{{ t("operations.kati.transfers.to") }}
        <input
          v-model="to"
          type="date"
          :min="from || undefined"
          class="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
      /></label>
    </div>

    <div v-if="transfers.isPending.value" class="space-y-2">
      <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-lg bg-muted" />
    </div>
    <ApiErrorCard v-else-if="transfers.error.value" :error="transfers.error.value" @retry="transfers.refetch()" />
    <template v-else-if="transfers.data.value">
      <p class="text-sm" data-testid="kati-transfers-totals">
        {{
          t("operations.kati.transfers.totals", {
            count: transfers.data.value.totaux.transferts,
            points: number.format(transfers.data.value.totaux.points),
            fcfa: number.format(transfers.data.value.totaux.valeurFcfa),
          })
        }}
      </p>
      <EmptyStateCard
        v-if="!transfers.data.value.elements.length"
        icon="ph:arrows-left-right"
        :text="t('operations.kati.transfers.empty')"
      />
      <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
        <li
          v-for="transfer in transfers.data.value.elements"
          :key="transfer.id"
          class="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center"
          :data-testid="`kati-transfer-${transfer.id}`"
        >
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ party(transfer.expediteur) }}</span>
            <span class="block truncate text-xs text-muted-foreground">{{ contact(transfer.expediteur) }}</span>
          </span>
          <Icon name="ph:arrow-right" class="hidden text-muted-foreground sm:block" aria-hidden="true" />
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ party(transfer.destinataire) }}</span>
            <span class="block truncate text-xs text-muted-foreground">{{ contact(transfer.destinataire) }}</span>
          </span>
          <span class="text-left sm:text-right">
            <strong class="block">{{
              t("operations.kati.transfers.points", { points: number.format(transfer.points) })
            }}</strong>
            <span class="block text-xs text-muted-foreground">{{
              t("operations.kati.transfers.valueAndDate", {
                fcfa: number.format(transfer.valeurFcfa),
                date: date.format(new Date(transfer.creeLe)),
              })
            }}</span>
          </span>
        </li>
      </ul>
      <div v-if="transfers.data.value.pages > 1" class="flex items-center justify-end gap-2 text-sm">
        <Button size="sm" variant="outline" :disabled="page <= 1" @click="page -= 1">{{
          t("operations.kati.transfers.previous")
        }}</Button>
        <span>{{ page }} / {{ transfers.data.value.pages }}</span>
        <Button
          size="sm"
          variant="outline"
          :disabled="page >= transfers.data.value.pages"
          data-testid="kati-transfers-next"
          @click="page += 1"
          >{{ t("operations.kati.transfers.next") }}</Button
        >
      </div>
    </template>
  </section>
</template>
