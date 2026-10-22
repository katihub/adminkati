<script setup lang="ts">
import type { PageContent } from "@/types/api/site-texts"
import SiteTextsRichText from "@/components/site-texts/RichText.vue"

defineProps<{ page: PageContent }>()
</script>

<template>
  <div>
    <p v-if="page.accroche" class="text-xs font-semibold uppercase text-muted-foreground">{{ page.accroche }}</p>
    <h2 class="font-heading text-xl font-bold">{{ page.titre }}</h2>
    <p class="mt-2 text-sm text-muted-foreground"><SiteTextsRichText :text="page.intro" /></p>
    <section v-for="(section, i) in page.sections" :key="i" class="mt-4">
      <h3 class="font-semibold">{{ section.titre }}</h3>
      <p v-for="(paragraph, p) in section.paragraphes" :key="p" class="mt-1 text-sm">
        <SiteTextsRichText :text="paragraph" />
      </p>
      <ul class="mt-1 list-disc pl-5 text-sm">
        <li v-for="(bullet, b) in section.puces ?? []" :key="b"><SiteTextsRichText :text="bullet" /></li>
      </ul>
      <div class="mt-2 grid gap-3 sm:grid-cols-2">
        <div v-for="(bloc, b) in section.blocs ?? []" :key="b">
          <p class="text-sm font-semibold">{{ bloc.titre }}</p>
          <p class="text-sm text-muted-foreground"><SiteTextsRichText :text="bloc.texte" /></p>
        </div>
      </div>
    </section>
  </div>
</template>
