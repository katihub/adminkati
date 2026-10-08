<script setup lang="ts">
import type { ExportDocument, ExportLocale } from "@/types/api/commandes"
import { ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiErrorText } from "@/utils/api-error"
import { downloadOrderExport, orderExportFilename, orderExportUrl, rehydrateExportError } from "@/utils/order-export"

const props = defineProps<{
  reference: string
}>()

const open = defineModel<boolean>("open", { default: false })

const { t, locale } = useI18n()

const EXPORT_DOCUMENTS: readonly ExportDocument[] = ["recapitulatif", "facture", "bon-preparation"]
const EXPORT_LOCALES: readonly ExportLocale[] = ["fr", "en"]

const documentType = ref<ExportDocument>("recapitulatif")
const language = ref<ExportLocale>("en")
const pending = ref(false)
const submitError = ref("")

watch(open, value => {
  if (value) {
    documentType.value = "recapitulatif"
    language.value = locale.value === "fr" ? "fr" : "en"
    submitError.value = ""
  }
})

async function onConfirm() {
  if (pending.value) return

  pending.value = true
  submitError.value = ""
  try {
    const blob = await $fetch<Blob>(orderExportUrl(props.reference, documentType.value, language.value), {
      responseType: "blob",
    })
    downloadOrderExport(blob, orderExportFilename(props.reference, documentType.value, language.value))
    open.value = false
  } catch (error: unknown) {
    submitError.value = apiErrorText(await rehydrateExportError(error), t)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent data-testid="orders-export-dialog">
      <DialogHeader>
        <DialogTitle>{{ t("orders.export.title", { reference }) }}</DialogTitle>
        <DialogDescription>{{ t("orders.export.description") }}</DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="orders-export-document">{{ t("orders.export.document") }}</Label>
          <Select v-model="documentType" :disabled="pending">
            <SelectTrigger id="orders-export-document" data-testid="orders-export-document" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="option in EXPORT_DOCUMENTS" :key="option" :value="option">
                  {{ t(`orders.export.documents.${option}`) }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="orders-export-language">{{ t("orders.export.language") }}</Label>
          <Select v-model="language" :disabled="pending">
            <SelectTrigger id="orders-export-language" data-testid="orders-export-language" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="option in EXPORT_LOCALES" :key="option" :value="option">
                  {{ t(`orders.export.languages.${option}`) }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p v-if="submitError" data-testid="orders-export-error" role="alert" class="text-sm text-destructive">
        {{ submitError }}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" :disabled="pending" @click="open = false">
          {{ t("orders.export.cancel") }}
        </Button>
        <Button
          type="button"
          data-testid="orders-export-confirm"
          :disabled="pending"
          :aria-busy="pending ? true : undefined"
          @click="onConfirm"
        >
          <Spinner v-if="pending" data-icon="inline-start" />
          {{ t("orders.export.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
