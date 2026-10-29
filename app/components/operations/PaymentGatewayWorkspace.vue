<script setup lang="ts">
import type { PaymentAttempt, PaymentAttemptState } from "@/types/api/payment-gateway"
import { computed, ref } from "vue"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCheckPaymentAttempt, usePaymentAttempts } from "@/composables/usePaymentGateway"
import { apiErrorText } from "@/utils/api-error"

/* THE PAYMENT GATEWAY, FOR THE DIRECTION. Kratospay's configuration, then the
   attempts that wait for a confirmation or failed. A waiting attempt can be
   checked with Kratospay: what it answers is applied, exactly like a signed
   notification, and nothing is ever collected twice. */
const { t, locale } = useI18n()
const state = ref<PaymentAttemptState>("attente")
const attempts = usePaymentAttempts(state)
const check = useCheckPaymentAttempt()
const checking = ref<string | null>(null)
const money = computed(() => new Intl.NumberFormat(locale.value))
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }))
const states: PaymentAttemptState[] = ["attente", "echec", "tous"]
const waiting = (attempt: PaymentAttempt) => attempt.statut === "CREATED" || attempt.statut === "PENDING"

async function verify(attempt: PaymentAttempt) {
  checking.value = attempt.transId
  try {
    const result = await check.mutateAsync(attempt.transId)
    toast.success(
      t(result.encaisse ? "operations.gateway.collected" : "operations.gateway.checked", { status: result.statut }),
    )
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  } finally {
    checking.value = null
  }
}
</script>

<template>
  <div
    class="min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10"
    data-testid="operations-payment-gateway-workspace"
  >
    <OperationsGatewayStatus />
    <section class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="item in states"
          :key="item"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium"
          :class="state === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'"
          :data-testid="`gateway-state-${item}`"
          @click="state = item"
        >
          {{
            t(`operations.gateway.states.${item}`, {
              count: item === "tous" ? 0 : (attempts.data.value?.compteurs[item] ?? 0),
            })
          }}
        </button>
      </div>
      <div v-if="attempts.isPending.value" class="h-32 animate-pulse rounded-lg bg-muted" />
      <ApiErrorCard v-else-if="attempts.error.value" :error="attempts.error.value" @retry="attempts.refetch()" />
      <EmptyStateCard
        v-else-if="!attempts.data.value?.elements.length"
        icon="ph:check-circle"
        :text="t('operations.gateway.empty')"
      />
      <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
        <li
          v-for="attempt in attempts.data.value.elements"
          :key="attempt.transId"
          class="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
          :data-testid="`gateway-attempt-${attempt.transId}`"
        >
          <span class="min-w-0">
            <span class="block font-medium">{{
              t(`operations.gateway.object.${attempt.objet.type}`, { reference: attempt.objet.reference ?? "—" })
            }}</span>
            <span class="block truncate text-xs text-muted-foreground"
              >{{ attempt.transId }} · {{ [attempt.telephone, attempt.operateur].filter(Boolean).join(" · ") }} ·
              {{ date.format(new Date(attempt.demandeLe)) }}</span
            >
          </span>
          <span class="text-left md:text-right">
            <strong class="block">{{
              t("operations.gateway.amount", { amount: money.format(attempt.montant) })
            }}</strong>
            <Badge variant="outline">{{ t(`operations.gateway.status.attempt.${attempt.statut}`) }}</Badge>
          </span>
          <Button
            v-if="waiting(attempt)"
            size="sm"
            variant="outline"
            :disabled="checking !== null"
            :data-testid="`gateway-check-${attempt.transId}`"
            @click="verify(attempt)"
            >{{ t("operations.gateway.check") }}</Button
          >
        </li>
      </ul>
    </section>
  </div>
</template>
