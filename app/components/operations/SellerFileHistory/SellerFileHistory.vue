<script setup lang="ts">
import type { SellerFileEvent } from "@/types/api/marketplace-moderation"
import { computed } from "vue"

/**
 * The history of a seller file, read from the audit journal (12 November 2026): signup, uploads,
 * reviews and decisions with their reason. The team sees a refusal followed by a new upload, instead
 * of a file that looks brand new.
 */
const { events, documentLabels } = defineProps<{
  events: SellerFileEvent[]
  /** Required-document labels by type, so `identite` reads as the document's name. */
  documentLabels: Record<string, string>
}>()
const { t, te, locale } = useI18n({ useScope: "local" })

const date = computed(
  () => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
)

function label(event: SellerFileEvent) {
  const key = `action.${event.action.replace(/^vendeur\./, "").replaceAll(".", "_")}`
  const action = te(key) ? t(key) : event.action
  if (!event.typePiece) return action
  return `${action} · ${documentLabels[event.typePiece] ?? event.typePiece}`
}

function who(event: SellerFileEvent) {
  if (event.acteur === "equipe") return event.par ?? t("team")
  if (event.acteur === "vendeur" || event.acteur === "anonyme") return t("seller")
  return null
}

/** Everything the template shows, worked out once per event. */
const rows = computed(() =>
  events.map((event, index) => {
    const by = who(event)
    const when = date.value.format(new Date(event.le))
    return {
      key: `${event.le}-${index}`,
      title: label(event),
      when: by ? `${when} · ${by}` : when,
      motif: event.motif,
      refusal: /refuse|modification_demandee/.test(event.action),
    }
  }),
)
</script>

<template>
  <section v-if="rows.length" class="rounded-lg border border-border bg-card" data-testid="seller-file-history">
    <h3 class="border-b border-border p-4 font-heading font-semibold">{{ t("title") }}</h3>
    <ol class="space-y-3 p-4">
      <li v-for="row in rows" :key="row.key" class="flex gap-3 text-sm">
        <span class="mt-1.5 size-2 shrink-0 rounded-full" :class="row.refusal ? 'bg-destructive' : 'bg-primary'" />
        <div class="min-w-0">
          <p class="font-medium">{{ row.title }}</p>
          <p class="text-xs text-muted-foreground">{{ row.when }}</p>
          <p v-if="row.motif" class="mt-0.5 text-xs" :class="row.refusal ? 'text-destructive' : ''">{{ row.motif }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "History",
    "team": "Team",
    "seller": "Seller",
    "action": {
      "inscription_recue": "Application received",
      "document_soumis": "Document uploaded",
      "document_pris_en_charge": "Document under review",
      "document_valide": "Document validated",
      "document_refuse": "Document refused",
      "document_expire": "Document expired",
      "dossier_approuve": "File approved",
      "dossier_modification_demandee": "Changes requested",
      "dossier_refuse": "File refused",
      "candidature_retiree": "Application withdrawn"
    }
  },
  "fr": {
    "title": "Historique",
    "team": "Équipe",
    "seller": "Vendeur",
    "action": {
      "inscription_recue": "Candidature reçue",
      "document_soumis": "Pièce déposée",
      "document_pris_en_charge": "Pièce prise en charge",
      "document_valide": "Pièce validée",
      "document_refuse": "Pièce refusée",
      "document_expire": "Pièce expirée",
      "dossier_approuve": "Dossier approuvé",
      "dossier_modification_demandee": "Modification demandée",
      "dossier_refuse": "Dossier refusé",
      "candidature_retiree": "Candidature retirée"
    }
  }
}
</i18n>
