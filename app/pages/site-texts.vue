<script setup lang="ts">
import SiteTextsWorkspace from "@/components/site-texts/Workspace.vue"

// Every team member may open the page; the backend setting decides who may write.
definePageMeta({ layout: "admin", team: true })

defineI18nRoute({
  paths: {
    en: "/site-texts",
    fr: "/textes-du-site",
  },
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("content.siteTexts.seo.title"),
  description: () => t("content.siteTexts.seo.description"),
})
</script>

<template>
  <div class="-mx-4 flex h-workspace flex-col overflow-hidden sm:-mx-6 lg:-mx-10">
    <div class="shrink-0 px-4 sm:px-6 lg:px-10">
      <AdminPageHeader :title="t('content.siteTexts.heading')" />
    </div>
    <SiteTextsWorkspace />
  </div>
</template>
