<script setup lang="ts">
import type { AdministrativeSystemStatus } from "@/types/api/administration"
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"
import { Skeleton } from "@/components/ui/skeleton"
definePageMeta({ layout: "admin", roles: ["direction"] })
defineI18nRoute({ paths: { en: "/settings", fr: "/parametres" } })
const { t } = useI18n({ useScope: "local" })
const session = useCachedSession()
const api = useApiFetch()
const query = useQuery<AdministrativeSystemStatus>({
  queryKey: ["v1", "administration", "systeme"],
  queryFn: () => api("/administration/systeme"),
  enabled: computed(() => session.value?.roles.includes("direction") ?? false),
})
useSeoMeta({
  title: () => t("title"),
  description: () => t("description"),
  ogTitle: () => t("title"),
  ogDescription: () => t("description"),
})
</script>
<template>
  <div class="flex min-w-0 flex-col gap-5 py-4" data-testid="admin-settings-page">
    <AdminPageHeader :title="t('title')"
      ><p>{{ t("description") }}</p></AdminPageHeader
    >
    <AdminSettingsModules />
    <ClientOnly>
      <AdminSystemEvidence
        :data="query.data.value"
        :loading="query.isPending.value"
        :error="query.error.value"
        @retry="query.refetch()"
      />
      <template #fallback><Skeleton class="h-48 rounded-2xl" /></template>
    </ClientOnly>
    <TeamRoleGuide />
  </div>
</template>
<i18n lang="json">
{
  "en": {
    "title": "Platform settings",
    "description": "Find the existing configuration modules, access responsibilities and recovery evidence in one place. Changes are saved in their source module."
  },
  "fr": {
    "title": "Paramètres de la plateforme",
    "description": "Retrouvez les modules de configuration existants, les responsabilités d’accès et les preuves de reprise. Les modifications se sauvegardent dans leur module d’origine."
  }
}
</i18n>
