<script setup lang="ts">
import type { AuditEntry } from "@/types/api/audit"
import { computed } from "vue"
import { auditReason, humanizeAction } from "@/utils/audit"

/**
 * One line of the audit (12 November 2026): when, what, who, on which object, from where. Opening it
 * shows the reason, the agent and the full detail.
 */
const { entry } = defineProps<{ entry: AuditEntry }>()
const { t, te, locale } = useI18n({ useScope: "local" })

const when = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: "short", timeStyle: "medium" }).format(new Date(entry.creeLe)),
)
const action = computed(() => {
  const key = `actions.${entry.action.replaceAll(".", "_")}`
  return te(key) ? t(key) : humanizeAction(entry.action)
})
const author = computed(() => {
  const name = entry.acteurNom ?? entry.acteurId ?? t("unknown")
  const shop = entry.acteurBoutique ? ` · ${entry.acteurBoutique}` : ""
  return `${name}${shop}`
})
const role = computed(() => entry.acteurRole ?? entry.acteurType)
const target = computed(() => [entry.cibleType, entry.cibleId].filter(Boolean).join(" · ") || "—")
const reason = computed(() => auditReason(entry.detail))
const detail = computed(() => (entry.detail === null ? null : JSON.stringify(entry.detail, null, 2)))
</script>

<template>
  <li class="border-b border-border" :data-testid="`audit-entry-${entry.id}`">
    <details class="group">
      <summary
        class="grid cursor-pointer list-none gap-1 px-4 py-3 text-sm hover:bg-muted/50 md:grid-cols-[150px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_120px] md:items-center md:gap-3"
      >
        <span class="text-xs text-muted-foreground tabular-nums">{{ when }}</span>
        <strong class="font-medium" data-testid="audit-entry-action">{{ action }}</strong>
        <span class="min-w-0 truncate" data-testid="audit-entry-author"
          >{{ author }} <span class="text-xs text-muted-foreground">({{ role }})</span></span
        >
        <span class="min-w-0 truncate text-xs text-muted-foreground">{{ target }}</span>
        <span class="font-mono text-xs text-muted-foreground" data-testid="audit-entry-ip">{{ entry.ip ?? "—" }}</span>
      </summary>
      <dl class="grid gap-2 bg-muted/40 px-4 py-3 text-xs sm:grid-cols-[120px_minmax(0,1fr)]">
        <dt class="text-muted-foreground">{{ t("code") }}</dt>
        <dd class="font-mono">{{ entry.action }}</dd>
        <template v-if="reason">
          <dt class="text-muted-foreground">{{ t("reason") }}</dt>
          <dd>{{ reason }}</dd>
        </template>
        <dt class="text-muted-foreground">{{ t("agent") }}</dt>
        <dd class="break-all">{{ entry.agent ?? "—" }}</dd>
        <template v-if="detail">
          <dt class="text-muted-foreground">{{ t("detail") }}</dt>
          <dd>
            <pre class="max-h-64 overflow-auto rounded bg-background p-2 font-mono text-[11px]">{{ detail }}</pre>
          </dd>
        </template>
      </dl>
    </details>
  </li>
</template>

<i18n lang="json">
{
  "fr": {
    "unknown": "Inconnu",
    "code": "Code",
    "reason": "Motif",
    "agent": "Navigateur",
    "detail": "Détail",
    "actions": {
      "marketplace_retrait_demande": "Retrait demandé",
      "marketplace_retrait_approuve": "Retrait approuvé",
      "marketplace_retrait_refuse": "Retrait refusé",
      "marketplace_retrait_payout_soumis": "Reversement envoyé",
      "marketplace_retrait_reverse": "Retrait reversé",
      "marketplace_retrait_piece_ajoutee": "Pièce de retrait ajoutée",
      "marketplace_finance_consultee": "Finances d’une boutique consultées",
      "marketplace_remboursement_prepare": "Remboursement préparé",
      "caisse_declaree": "Caisse déclarée",
      "caisse_validee": "Caisse validée",
      "commande_confirmee": "Commande confirmée",
      "commande_soumise": "Commande passée",
      "commande_exportee": "Commandes exportées",
      "vendeur_inscription_recue": "Candidature vendeur reçue",
      "vendeur_document_soumis": "Pièce vendeur déposée",
      "vendeur_document_pris_en_charge": "Pièce vendeur prise en charge",
      "vendeur_document_valide": "Pièce vendeur validée",
      "vendeur_document_refuse": "Pièce vendeur refusée",
      "vendeur_document_consulte": "Pièce vendeur consultée",
      "vendeur_dossier_approuve": "Dossier vendeur approuvé",
      "vendeur_dossier_modification_demandee": "Modification du dossier demandée",
      "vendeur_dossier_refuse": "Dossier vendeur refusé",
      "vendeur_candidature_retiree": "Candidature retirée",
      "vendeur_commission_modifiee": "Commission modifiée",
      "equipe_inscrit": "Membre de l’équipe ajouté",
      "equipe_modifie": "Membre de l’équipe modifié",
      "equipe_desactive": "Membre de l’équipe désactivé",
      "equipe_reactive": "Membre de l’équipe réactivé",
      "client_consulte": "Fiche client consultée",
      "audit_exporte": "Audit exporté"
    }
  },
  "en": {
    "unknown": "Unknown",
    "code": "Code",
    "reason": "Reason",
    "agent": "Browser",
    "detail": "Detail",
    "actions": {
      "marketplace_retrait_demande": "Withdrawal requested",
      "marketplace_retrait_approuve": "Withdrawal approved",
      "marketplace_retrait_refuse": "Withdrawal refused",
      "marketplace_retrait_payout_soumis": "Payout sent",
      "marketplace_retrait_reverse": "Withdrawal paid out",
      "marketplace_retrait_piece_ajoutee": "Withdrawal document added",
      "marketplace_finance_consultee": "Shop finances viewed",
      "marketplace_remboursement_prepare": "Refund prepared",
      "caisse_declaree": "Till declared",
      "caisse_validee": "Till validated",
      "commande_confirmee": "Order confirmed",
      "commande_soumise": "Order placed",
      "commande_exportee": "Orders exported",
      "vendeur_inscription_recue": "Seller application received",
      "vendeur_document_soumis": "Seller document uploaded",
      "vendeur_document_pris_en_charge": "Seller document under review",
      "vendeur_document_valide": "Seller document validated",
      "vendeur_document_refuse": "Seller document refused",
      "vendeur_document_consulte": "Seller document viewed",
      "vendeur_dossier_approuve": "Seller file approved",
      "vendeur_dossier_modification_demandee": "Seller file changes requested",
      "vendeur_dossier_refuse": "Seller file refused",
      "vendeur_candidature_retiree": "Application withdrawn",
      "vendeur_commission_modifiee": "Commission changed",
      "equipe_inscrit": "Team member added",
      "equipe_modifie": "Team member changed",
      "equipe_desactive": "Team member deactivated",
      "equipe_reactive": "Team member reactivated",
      "client_consulte": "Customer file viewed",
      "audit_exporte": "Audit exported"
    }
  }
}
</i18n>
