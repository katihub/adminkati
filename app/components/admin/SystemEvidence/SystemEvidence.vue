<script setup lang="ts">
import type { AdministrativeSystemStatus, AdministrativeEvidenceStatus } from "@/types/api/administration"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateCourte } from "@/utils/dates"
const { data, loading, error } = defineProps<{
  data: AdministrativeSystemStatus | undefined
  loading: boolean
  error: unknown
}>()
const emit = defineEmits<{ retry: [] }>()
const { t, locale, tm, rt } = useI18n({ useScope: "local" })
function statusLabel(status: AdministrativeEvidenceStatus) {
  return rt((tm("status") as Record<AdministrativeEvidenceStatus, string>)[status])
}
function evidenceDate(date: string | null) {
  return date ? formatDateCourte(date, locale.value) : t("unknownDate")
}
const offsiteLabel = computed(() => {
  const reported = data?.sauvegarde.horsSite
  if (reported === null || reported === undefined) return t("unknown")
  return reported ? t("yes") : t("no")
})
const evidenceKeys = ["sauvegarde", "restauration"] as const
</script>
<template>
  <section class="rounded-2xl border border-border bg-card p-4 sm:p-6" data-testid="admin-system-evidence">
    <h2 class="font-heading text-lg font-semibold">{{ t("title") }}</h2>
    <p class="mt-1 text-sm text-muted-foreground">{{ t("description") }}</p>
    <ApiErrorCard v-if="error" class="mt-4" :error="error" @retry="emit('retry')" />
    <div v-else-if="loading" class="mt-4 grid gap-3 sm:grid-cols-2">
      <Skeleton v-for="key in evidenceKeys" :key="key" class="h-32 rounded-xl" />
    </div>
    <template v-else-if="data">
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <article
          v-for="key in evidenceKeys"
          :key="key"
          class="flex flex-col gap-3 rounded-xl border border-border p-4"
          :data-testid="`admin-system-${key}`"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-semibold">{{ t(key) }}</h3>
            <Badge :variant="data[key].statut === 'ok' ? 'success' : 'secondary'">{{
              statusLabel(data[key].statut)
            }}</Badge>
          </div>
          <p class="text-sm text-muted-foreground">
            {{ evidenceDate(data[key].date) }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ t(key === "sauvegarde" ? "backupFreshness" : "restoreFreshness") }}
          </p>
        </article>
      </div>
      <dl class="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <dt class="text-xs text-muted-foreground">{{ t("offsite") }}</dt>
          <dd>{{ offsiteLabel }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t("timezone") }}</dt>
          <dd>{{ data.fuseau }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t("checked") }}</dt>
          <dd>{{ formatDateCourte(data.verifieLe, locale) }}</dd>
        </div>
      </dl>
      <p class="mt-4 text-xs leading-relaxed text-muted-foreground">{{ t("notice") }}</p>
    </template>
  </section>
</template>
<i18n lang="json">
{
  "en": {
    "title": "Continuity and recovery evidence",
    "description": "Read-only status of the reports produced by the server. No backup or restoration is triggered from this page.",
    "sauvegarde": "Last backup",
    "restauration": "Last restoration rehearsal",
    "unknownDate": "No usable dated evidence",
    "backupFreshness": "Expected evidence: at most 7 hours old.",
    "restoreFreshness": "Expected evidence: at most 7 days old.",
    "offsite": "Off-site copy reported",
    "unknown": "Not confirmed",
    "yes": "Yes",
    "no": "No",
    "timezone": "Business timezone",
    "checked": "Checked at",
    "notice": "An OK result is a dated report, not a new recovery test. An absent or unreadable report never counts as success. The deployment must provide the genuine backup and restoration reports through read-only mounts.",
    "status": {
      "non_configuree": "Not configured",
      "illisible": "Unreadable report",
      "invalide": "Invalid report",
      "echec": "Reported failure",
      "ancienne": "Outdated evidence",
      "ok": "Recent successful report"
    }
  },
  "fr": {
    "title": "Continuité et preuves de reprise",
    "description": "Lecture seule des rapports produits par le serveur. Aucune sauvegarde ni restauration n’est déclenchée depuis cette page.",
    "sauvegarde": "Dernière sauvegarde",
    "restauration": "Dernier exercice de restauration",
    "unknownDate": "Aucune preuve datée exploitable",
    "backupFreshness": "Preuve attendue : 7 heures au maximum.",
    "restoreFreshness": "Preuve attendue : 7 jours au maximum.",
    "offsite": "Copie hors site déclarée",
    "unknown": "Non confirmée",
    "yes": "Oui",
    "no": "Non",
    "timezone": "Fuseau métier",
    "checked": "Vérifié le",
    "notice": "Un résultat OK correspond à un rapport daté, pas à un nouveau test de reprise. Une preuve absente ou illisible ne vaut jamais succès. Le déploiement doit fournir les vrais rapports de sauvegarde et de restauration par des montages en lecture seule.",
    "status": {
      "non_configuree": "Non configurée",
      "illisible": "Rapport illisible",
      "invalide": "Rapport invalide",
      "echec": "Échec déclaré",
      "ancienne": "Preuve ancienne",
      "ok": "Rapport récent réussi"
    }
  }
}
</i18n>
