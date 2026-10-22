<script setup lang="ts">
import type { PageForm } from "@/utils/site-texts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/* A locked page (About) keeps its sections and blocks: the site lays them out
   by position, so only their words change. */
defineProps<{ language: "fr" | "en"; locked: boolean }>()
const form = defineModel<PageForm>({ required: true })

const { t } = useI18n()

function addSection() {
  form.value.sections.push({ titre: "", paragraphes: "", puces: "", blocs: [] })
}

function removeSection(index: number) {
  form.value.sections.splice(index, 1)
}

function move(index: number, step: -1 | 1) {
  const target = index + step
  if (target < 0 || target >= form.value.sections.length) return
  const [section] = form.value.sections.splice(index, 1)
  form.value.sections.splice(target, 0, section!)
}
</script>

<template>
  <div class="grid gap-4">
    <p class="text-xs text-muted-foreground">{{ t("content.siteTexts.markupHelp") }}</p>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="grid gap-1.5">
        <Label :for="`${language}-title`">{{ t("content.siteTexts.fields.title") }}</Label>
        <Input :id="`${language}-title`" v-model="form.titre" :data-testid="`site-text-${language}-title`" />
      </div>
      <div class="grid gap-1.5">
        <Label :for="`${language}-eyebrow`">{{ t("content.siteTexts.fields.eyebrow") }}</Label>
        <Input :id="`${language}-eyebrow`" v-model="form.accroche" />
      </div>
    </div>
    <div class="grid gap-1.5">
      <Label :for="`${language}-intro`">{{ t("content.siteTexts.fields.intro") }}</Label>
      <textarea
        :id="`${language}-intro`"
        v-model="form.intro"
        rows="2"
        class="rounded-md border border-input bg-background p-2 text-sm"
      />
    </div>
    <fieldset
      v-for="(section, index) in form.sections"
      :key="index"
      class="grid gap-2 rounded-md border border-border p-3"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Input
          v-model="section.titre"
          class="min-w-0 flex-1"
          :aria-label="t('content.siteTexts.fields.sectionTitle')"
        />
        <template v-if="!locked">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            :aria-label="t('content.siteTexts.moveUp')"
            @click="move(index, -1)"
            ><Icon name="ph:arrow-up" aria-hidden="true"
          /></Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            :aria-label="t('content.siteTexts.moveDown')"
            @click="move(index, 1)"
            ><Icon name="ph:arrow-down" aria-hidden="true"
          /></Button>
          <Button type="button" size="sm" variant="ghost" @click="removeSection(index)">{{
            t("content.siteTexts.removeSection")
          }}</Button>
        </template>
      </div>
      <textarea
        v-model="section.paragraphes"
        rows="4"
        class="rounded-md border border-input bg-background p-2 text-sm"
        :placeholder="t('content.siteTexts.fields.paragraphs')"
      />
      <textarea
        v-if="!locked || section.puces"
        v-model="section.puces"
        rows="2"
        class="rounded-md border border-input bg-background p-2 text-sm"
        :placeholder="t('content.siteTexts.fields.bullets')"
      />
      <div v-for="(bloc, b) in section.blocs" :key="b" class="grid gap-1 rounded-md bg-muted/50 p-2">
        <Input v-model="bloc.titre" :aria-label="t('content.siteTexts.fields.blockTitle')" />
        <textarea v-model="bloc.texte" rows="2" class="rounded-md border border-input bg-background p-2 text-sm" />
      </div>
    </fieldset>
    <Button v-if="!locked" type="button" variant="outline" size="sm" class="justify-self-start" @click="addSection">{{
      t("content.siteTexts.addSection")
    }}</Button>
  </div>
</template>
