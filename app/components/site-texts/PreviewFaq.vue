<script setup lang="ts">
import type { FaqContent } from "@/types/api/site-texts"
import SiteTextsRichText from "@/components/site-texts/RichText.vue"

defineProps<{ faq: FaqContent }>()
</script>

<template>
  <div>
    <h2 class="font-heading text-xl font-bold">{{ faq.titre }}</h2>
    <p class="mt-2 text-sm text-muted-foreground"><SiteTextsRichText :text="faq.intro" /></p>
    <section v-for="topic in faq.rubriques" :key="topic.id" class="mt-4">
      <h3 class="font-semibold">{{ topic.titre }}</h3>
      <details v-for="question in topic.questions" :key="question.id" class="mt-1 text-sm">
        <summary class="cursor-pointer">{{ question.question }}</summary>
        <p class="mt-1 text-muted-foreground"><SiteTextsRichText :text="question.reponse" /></p>
      </details>
    </section>
  </div>
</template>
