<script setup lang="ts">
import type { MarketplaceReturnDetail } from "@/types/api/marketplace-operations"
import { computed } from "vue"
const { detail } = defineProps<{ detail: MarketplaceReturnDetail }>()
const { t, locale } = useI18n({ useScope: "local" })
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
</script>

<template>
  <section class="rounded-2xl border border-border bg-card p-4" data-testid="return-settlement">
    <h3 class="font-heading font-semibold">{{ t("title") }}</h3>
    <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("seller") }}</dt>
        <dd>{{ detail.demande.boutique.vendeur?.nomLegal ?? detail.demande.boutique.nom }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("returnReference") }}</dt>
        <dd class="break-all">{{ detail.referenceRetour ?? "—" }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("refunded") }}</dt>
        <dd>{{ money.format(detail.montantRembourseFcfa) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("fees") }}</dt>
        <dd>{{ money.format(detail.fraisRetourFcfa) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("commission") }}</dt>
        <dd>{{ money.format(detail.commissionCorrigeeFcfa) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("refundReference") }}</dt>
        <dd class="break-all">{{ detail.referenceRemboursement ?? "—" }}</dd>
      </div>
      <template v-if="detail.remboursementPsp">
        <div>
          <dt class="text-xs text-muted-foreground">{{ t("pspAmount") }}</dt>
          <dd>{{ money.format(detail.remboursementPsp.montantFcfa) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t("checked") }}</dt>
          <dd>
            {{
              detail.remboursementPsp.verifieLe
                ? new Date(detail.remboursementPsp.verifieLe).toLocaleString(locale)
                : "—"
            }}
          </dd>
        </div>
      </template>
    </dl>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Return and settlement",
    "seller": "Seller",
    "returnReference": "Return reference",
    "refunded": "Refund recorded",
    "fees": "Return costs",
    "commission": "Commission adjustment",
    "refundReference": "Refund reference",
    "pspAmount": "Payment provider amount",
    "checked": "Last reconciliation"
  },
  "fr": {
    "title": "Retour et règlement",
    "seller": "Vendeur",
    "returnReference": "Référence du retour",
    "refunded": "Remboursement enregistré",
    "fees": "Frais de retour",
    "commission": "Commission corrigée",
    "refundReference": "Référence du remboursement",
    "pspAmount": "Montant chez le prestataire",
    "checked": "Dernier rapprochement"
  }
}
</i18n>
