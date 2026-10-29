<script setup lang="ts">
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { usePaymentGatewayCertification } from "@/composables/usePaymentGateway"

/* Whether Kratospay can take money right now: keys present, notifications signed,
   status lookup configured. The key itself is never shown. */
const { t } = useI18n()
const certification = usePaymentGatewayCertification()
const etat = computed(() => certification.data.value ?? null)
const ouiNon = (valeur: boolean) => t(valeur ? "operations.gateway.status.yes" : "operations.gateway.status.no")
const lignes = computed(() => {
  const c = etat.value
  if (!c) return []
  return [
    { cle: "environment", valeur: c.environnement ? t(`operations.gateway.status.env.${c.environnement}`) : "—" },
    { cle: "notifications", valeur: ouiNon(c.notificationsSignees) },
    { cle: "lookup", valeur: ouiNon(c.consultationStatut) },
  ]
})
const pret = computed(() => etat.value?.pret ?? false)
</script>

<template>
  <section class="rounded-lg border border-border bg-card p-4" data-testid="gateway-status">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-heading text-base font-semibold">{{ t("operations.gateway.status.title") }}</h2>
      <Badge v-if="etat" :class="pret ? '' : 'text-destructive'" variant="outline" data-testid="gateway-ready">{{
        t(pret ? "operations.gateway.status.ready" : "operations.gateway.status.notReady")
      }}</Badge>
    </div>
    <div v-if="certification.isPending.value" class="mt-3 h-16 animate-pulse rounded-md bg-muted" />
    <ApiErrorCard
      v-else-if="certification.error.value"
      class="mt-3"
      :error="certification.error.value"
      @retry="certification.refetch()"
    />
    <template v-else-if="etat">
      <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div v-for="ligne in lignes" :key="ligne.cle">
          <dt class="text-muted-foreground">{{ t(`operations.gateway.status.${ligne.cle}`) }}</dt>
          <dd class="font-medium">{{ ligne.valeur }}</dd>
        </div>
      </dl>
      <ul v-if="etat.erreurs.length" class="mt-3 list-disc pl-5 text-xs text-destructive">
        <li v-for="erreur in etat.erreurs" :key="erreur">{{ erreur }}</li>
      </ul>
    </template>
  </section>
</template>
