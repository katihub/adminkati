<script setup lang="ts">
import { Button } from "@/components/ui/button"

defineProps<{ file: File | null; errorMessage: string }>()
const emit = defineEmits<{
  select: [file?: File]
  template: []
  preview: []
}>()
const { t } = useI18n()
const input = useTemplateRef<HTMLInputElement>("fileInput")
</script>

<template>
  <div class="space-y-5">
    <button
      type="button"
      class="group flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition hover:border-primary/60 hover:bg-primary/5"
      @click="input?.click()"
    >
      <Icon name="ph:file-arrow-up" class="size-9 text-primary transition group-hover:-translate-y-0.5" />
      <span class="font-medium">{{ file?.name ?? t("products.productImport.choose") }}</span>
      <span class="text-sm text-muted-foreground">{{ t("products.productImport.limits") }}</span>
    </button>
    <input
      ref="fileInput"
      class="sr-only"
      type="file"
      accept=".csv,.xlsx"
      @change="emit('select', ($event.target as HTMLInputElement).files?.[0])"
    />
    <p v-if="errorMessage" role="alert" class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ errorMessage }}
    </p>
    <div class="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
      {{ t("products.productImport.columns") }}
    </div>
    <div class="flex flex-wrap justify-between gap-2">
      <Button variant="ghost" @click="emit('template')">
        <Icon name="ph:download-simple" />{{ t("products.productImport.template") }}
      </Button>
      <Button :disabled="!file" @click="emit('preview')">
        <Icon name="ph:magnifying-glass" />{{ t("products.productImport.preview") }}
      </Button>
    </div>
  </div>
</template>
