<script setup lang="ts">
import type { EmailForm } from "@/utils/site-texts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

defineProps<{ language: "fr" | "en"; variables: string[] }>()
const form = defineModel<EmailForm>({ required: true })

const { t } = useI18n()
const variable = (name: string) => `{${name}}`
</script>

<template>
  <div class="grid gap-3">
    <p class="text-xs text-muted-foreground">
      {{ t("content.siteTexts.emailHelp") }}
      <code v-for="name in variables" :key="name" class="mx-0.5 rounded bg-muted px-1">{{ variable(name) }}</code>
    </p>
    <div class="grid gap-1.5">
      <Label :for="`${language}-subject`">{{ t("content.siteTexts.fields.subject") }}</Label>
      <Input :id="`${language}-subject`" v-model="form.sujet" :data-testid="`site-text-${language}-subject`" />
    </div>
    <div class="grid gap-1.5">
      <Label :for="`${language}-body`">{{ t("content.siteTexts.fields.paragraphs") }}</Label>
      <textarea
        :id="`${language}-body`"
        v-model="form.paragraphes"
        rows="6"
        class="rounded-md border border-input bg-background p-2 text-sm"
      />
    </div>
    <div class="grid gap-1.5">
      <Label :for="`${language}-button`">{{ t("content.siteTexts.fields.button") }}</Label>
      <Input :id="`${language}-button`" v-model="form.bouton" />
    </div>
  </div>
</template>
