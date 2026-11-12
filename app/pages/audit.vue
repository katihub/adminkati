<script setup lang="ts">
import type { AuditFilters } from "@/types/api/audit"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { downloadAuditExport, useAuditPage } from "@/composables/useAudit"
import { apiErrorText } from "@/utils/api-error"
import { downloadBlob } from "@/utils/download-file"

/* THE AUDIT (12 November 2026): who did what, and when, read from the backend journal. The direction
   only: the journal also holds the direction's own actions and the money. See plans/2026-11-12-audit.md. */
definePageMeta({ layout: "admin", roles: ["direction"] })
defineI18nRoute({ paths: { en: "/audit", fr: "/audit" } })

const { t } = useI18n({ useScope: "local" })
const { t: tGlobal } = useI18n()
useSeoMeta({ title: () => t("seoTitle"), robots: "noindex, nofollow" })

const filters = ref<AuditFilters>({})
const page = ref(1)
watch(filters, () => (page.value = 1), { deep: true })
const query = useAuditPage(filters, page)
const data = computed(() => query.data.value)
const exporting = ref(false)

async function exportCsv() {
  exporting.value = true
  try {
    const blob = await downloadAuditExport(filters.value)
    downloadBlob(blob, `audit-${new Date().toISOString().slice(0, 10)}.csv`)
  } catch (cause) {
    toast.error(apiErrorText(cause, tGlobal))
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 sm:p-6" data-testid="audit-page">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-foreground">{{ t("heading") }}</h1>
        <p class="text-sm text-muted-foreground">{{ t("help") }}</p>
      </div>
      <Button variant="outline" :disabled="exporting || !data?.total" data-testid="audit-export" @click="exportCsv"
        ><Icon name="ph:download-simple" /> {{ t("export") }}</Button
      >
    </div>

    <AuditFilters v-model="filters" />

    <div class="rounded-lg border border-border bg-card">
      <div class="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span data-testid="audit-total">{{ t("count", { count: data?.total ?? 0 }) }}</span>
        <span v-if="query.isFetching.value">{{ t("loading") }}</span>
      </div>
      <p v-if="query.error.value" class="p-6 text-sm text-destructive" role="alert">
        {{ apiErrorText(query.error.value, tGlobal) }}
      </p>
      <p v-else-if="query.isPending.value" class="p-6 text-sm text-muted-foreground">{{ t("loading") }}</p>
      <p v-else-if="!data?.elements.length" class="p-6 text-center text-sm text-muted-foreground">{{ t("empty") }}</p>
      <ul v-else>
        <AuditEntryRow v-for="entry in data.elements" :key="entry.id" :entry="entry" />
      </ul>
      <nav
        v-if="(data?.pages ?? 1) > 1"
        class="flex items-center justify-center gap-3 border-t border-border p-3"
        data-testid="audit-pagination"
      >
        <Button variant="outline" size="icon" :aria-label="t('previous')" :disabled="page <= 1" @click="page--"
          ><Icon name="ph:caret-left"
        /></Button>
        <span class="text-xs">{{ page }} / {{ data?.pages }}</span>
        <Button
          variant="outline"
          size="icon"
          :aria-label="t('next')"
          :disabled="page >= (data?.pages ?? 1)"
          @click="page++"
          ><Icon name="ph:caret-right"
        /></Button>
      </nav>
    </div>
  </section>
</template>

<i18n lang="json">
{
  "fr": {
    "seoTitle": "Audit · Administration KatiMarket",
    "heading": "Audit",
    "help": "Qui a fait quoi, et quand. Chaque action enregistrée, avec son auteur, son objet et l’adresse IP. Cliquez sur une ligne pour le détail.",
    "export": "Exporter (CSV)",
    "count": "{count} action | {count} actions",
    "loading": "Chargement…",
    "empty": "Aucune action pour ces filtres.",
    "previous": "Page précédente",
    "next": "Page suivante"
  },
  "en": {
    "seoTitle": "Audit · KatiMarket administration",
    "heading": "Audit",
    "help": "Who did what, and when. Every recorded action, with its author, its object and the IP address. Click a line for the detail.",
    "export": "Export (CSV)",
    "count": "{count} action | {count} actions",
    "loading": "Loading…",
    "empty": "No action for these filters.",
    "previous": "Previous page",
    "next": "Next page"
  }
}
</i18n>
