<script setup lang="ts">
import type { FaqContent } from "@/types/api/site-texts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

defineProps<{ language: "fr" | "en" }>()
const form = defineModel<FaqContent>({ required: true })

const { t } = useI18n()
// A stable identifier per question: it is the anchor of the public page (/faq#id).
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`

function addTopic() {
  form.value.rubriques.push({
    id: newId("rubrique"),
    titre: "",
    questions: [{ id: newId("question"), question: "", reponse: "" }],
  })
}

function addQuestion(topic: number) {
  form.value.rubriques[topic]!.questions.push({ id: newId("question"), question: "", reponse: "" })
}
</script>

<template>
  <div class="grid gap-4">
    <p class="text-xs text-muted-foreground">{{ t("content.siteTexts.markupHelp") }}</p>
    <div class="grid gap-1.5">
      <Label :for="`${language}-faq-title`">{{ t("content.siteTexts.fields.title") }}</Label>
      <Input :id="`${language}-faq-title`" v-model="form.titre" :data-testid="`site-text-${language}-title`" />
    </div>
    <div class="grid gap-1.5">
      <Label :for="`${language}-faq-intro`">{{ t("content.siteTexts.fields.intro") }}</Label>
      <textarea
        :id="`${language}-faq-intro`"
        v-model="form.intro"
        rows="2"
        class="rounded-md border border-input bg-background p-2 text-sm"
      />
    </div>
    <fieldset
      v-for="(topic, i) in form.rubriques"
      :key="topic.id"
      class="grid gap-2 rounded-md border border-border p-3"
    >
      <div class="flex gap-2">
        <Input v-model="topic.titre" class="flex-1" :aria-label="t('content.siteTexts.fields.topic')" />
        <Button type="button" size="sm" variant="ghost" @click="form.rubriques.splice(i, 1)">{{
          t("content.siteTexts.remove")
        }}</Button>
      </div>
      <div v-for="(question, q) in topic.questions" :key="question.id" class="grid gap-1 rounded-md bg-muted/50 p-2">
        <div class="flex gap-2">
          <Input v-model="question.question" class="flex-1" :aria-label="t('content.siteTexts.fields.question')" />
          <Button type="button" size="sm" variant="ghost" @click="topic.questions.splice(q, 1)">{{
            t("content.siteTexts.remove")
          }}</Button>
        </div>
        <textarea
          v-model="question.reponse"
          rows="3"
          class="rounded-md border border-input bg-background p-2 text-sm"
          :aria-label="t('content.siteTexts.fields.answer')"
        />
        <p v-if="question.fiche" class="text-xs text-muted-foreground">
          {{ t("content.siteTexts.linkedSheet", { sheet: question.fiche }) }}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" class="justify-self-start" @click="addQuestion(i)">{{
        t("content.siteTexts.addQuestion")
      }}</Button>
    </fieldset>
    <Button type="button" variant="outline" size="sm" class="justify-self-start" @click="addTopic">{{
      t("content.siteTexts.addTopic")
    }}</Button>
  </div>
</template>
