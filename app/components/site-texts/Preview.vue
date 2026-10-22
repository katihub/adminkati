<script setup lang="ts">
import type { EmailContent, FaqContent, PageContent, SiteTextContent, SiteTextType } from "@/types/api/site-texts"
import { computed } from "vue"
import SiteTextsPreviewFaq from "@/components/site-texts/PreviewFaq.vue"
import SiteTextsPreviewPage from "@/components/site-texts/PreviewPage.vue"

const props = defineProps<{ type: SiteTextType; content: SiteTextContent }>()
const { t } = useI18n()
const isPage = computed(() => props.type === "legal" || props.type === "editorial")
const email = computed(() => props.content as EmailContent)
</script>

<template>
  <article class="rounded-md border border-border bg-background p-5" data-testid="site-text-preview">
    <SiteTextsPreviewPage v-if="isPage" :page="content as PageContent" />
    <SiteTextsPreviewFaq v-else-if="type === 'faq'" :faq="content as FaqContent" />
    <div v-else>
      <p class="text-xs text-muted-foreground">{{ t("content.siteTexts.fields.subject") }}</p>
      <p class="font-semibold">{{ email.sujet }}</p>
      <p v-for="(paragraph, p) in email.paragraphes" :key="p" class="mt-2 text-sm">{{ paragraph }}</p>
      <p v-if="email.bouton" class="mt-3 inline-block rounded bg-primary px-3 py-1 text-sm text-primary-foreground">
        {{ email.bouton }}
      </p>
    </div>
  </article>
</template>
