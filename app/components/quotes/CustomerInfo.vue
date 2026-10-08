<script setup lang="ts">
import type { DevisDetail } from "@/types/api/devis"
import { PhUserCircleMinus } from "@phosphor-icons/vue"
import { computed } from "vue"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useCustomer } from "@/composables/useCustomers"

const { quote } = defineProps<{
  quote: DevisDetail
}>()

const { t } = useI18n()

/** Client-only, best-effort — the quote itself only carries `clientId`, not a name. Same
 *  pattern as `LineRow.vue`'s product lookup: never prefetched, never blocks the initial render. */
const { data: customer, isError } = useCustomer(computed(() => quote.clientId))
const profile = computed(() => customer.value?.profil ?? null)
</script>

<template>
  <section class="rounded-2xl bg-card p-5 space-y-4" data-testid="quotes-detail-customer-info">
    <div class="flex items-center gap-2">
      <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name="ph:user" size="15" aria-hidden="true" />
      </div>
      <h3 class="font-heading text-sm font-semibold text-foreground">
        {{ t("quotes.detail.customerInfoTitle") }}
      </h3>
    </div>

    <Empty v-if="isError" class="p-6" data-testid="quotes-detail-customer-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PhUserCircleMinus :size="24" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ t("quotes.detail.customerUnavailable") }}</EmptyTitle>
      </EmptyHeader>
    </Empty>

    <QuotesCustomerDetails v-else-if="profile" :profile="profile" />

    <!-- Converted Order Link is independent of customer async profile resolution -->
    <QuotesOrderLink v-if="quote.commandeReference" :reference="quote.commandeReference" />
  </section>
</template>
