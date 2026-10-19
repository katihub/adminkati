<script setup lang="ts">
import type { ProductImportResponse } from "@/types/api/product-import"
import { Button } from "@/components/ui/button"

defineProps<{ response: ProductImportResponse; result: boolean }>()
const emit = defineEmits<{ reset: []; errors: []; apply: []; done: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-xl bg-primary/10 p-4">
        <p class="text-2xl font-semibold">{{ response.pretes || response.creees }}</p>
        <p class="text-sm text-muted-foreground">
          {{ result ? t("products.productImport.created") : t("products.productImport.ready") }}
        </p>
      </div>
      <div class="rounded-xl bg-destructive/10 p-4">
        <p class="text-2xl font-semibold text-destructive">{{ response.echouees }}</p>
        <p class="text-sm text-muted-foreground">{{ t("products.productImport.failed") }}</p>
      </div>
      <div class="rounded-xl bg-muted p-4">
        <p class="text-2xl font-semibold">{{ response.total_lignes }}</p>
        <p class="text-sm text-muted-foreground">{{ t("products.productImport.total") }}</p>
      </div>
    </div>
    <div class="max-h-80 overflow-auto rounded-xl border">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-muted">
          <tr>
            <th class="p-3 text-left">{{ t("products.productImport.line") }}</th>
            <th class="p-3 text-left">{{ t("products.productImport.product") }}</th>
            <th class="p-3 text-left">{{ t("products.productImport.price") }}</th>
            <th class="p-3 text-left">{{ t("products.productImport.status") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in response.lignes" :key="row.ligne" class="border-t align-top">
            <td class="p-3">{{ row.ligne }}</td>
            <td class="p-3">
              <p class="font-medium">{{ row.nom || "—" }}</p>
              <p v-if="row.message" class="mt-1 text-xs text-destructive">{{ row.message }}</p>
            </td>
            <td class="p-3 tabular-nums">{{ row.prix_saisi || "—" }}</td>
            <td class="p-3">
              <span :class="row.statut === 'echec' ? 'text-destructive' : 'text-emerald-700'">
                {{ t(`products.productImport.statuses.${row.statut}`) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="result" class="rounded-lg bg-emerald-50 p-3 font-medium text-emerald-800">
      {{ t("products.productImport.result", { count: response.creees }) }}
    </p>
    <div class="flex flex-wrap justify-between gap-2">
      <Button variant="outline" @click="emit('reset')">
        {{ result ? t("products.productImport.another") : t("products.productImport.back") }}
      </Button>
      <div class="flex flex-wrap justify-end gap-2">
        <Button v-if="response.echouees" variant="ghost" @click="emit('errors')">
          <Icon name="ph:download-simple" />{{ t("products.productImport.errors") }}
        </Button>
        <Button v-if="!result" :disabled="!response.pretes" @click="emit('apply')">
          {{ t("products.productImport.apply", { count: response.pretes }) }}
        </Button>
        <Button v-else @click="emit('done')">{{ t("products.productImport.done") }}</Button>
      </div>
    </div>
  </div>
</template>
