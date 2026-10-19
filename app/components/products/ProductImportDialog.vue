<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useProductImportRun } from "@/composables/useProductImportRun"
import {
  buildProductImportErrorCsv,
  buildProductImportTemplate,
  downloadProductImportFile,
  PRODUCT_IMPORT_MAX_BYTES,
} from "@/utils/product-import-files"

const open = defineModel<boolean>("open", { default: false })
const { t } = useI18n()
const session = useCachedSession()
const allowed = computed(() => session.value?.roles.includes("direction") ?? false)
const runner = useProductImportRun()
const file = ref<File | null>(null)
const fileError = ref("")
const busy = computed(() => runner.state.value === "previewing" || runner.state.value === "importing")
const isResult = computed(() => runner.state.value === "result")
const response = computed(() => runner.result.value ?? runner.preview.value)
const visible = computed({
  get: () => open.value && allowed.value,
  set: value => {
    if (!busy.value) open.value = value
  },
})

watch(visible, value => {
  if (value) return
  file.value = null
  fileError.value = ""
  runner.reset()
})

function selectFile(selected?: File) {
  file.value = null
  fileError.value = ""
  if (!selected) return
  if (/\.xls$/i.test(selected.name)) fileError.value = t("products.productImport.legacyXls")
  else if (!/\.(csv|xlsx)$/i.test(selected.name)) fileError.value = t("products.productImport.wrongType")
  else if (selected.size > PRODUCT_IMPORT_MAX_BYTES) fileError.value = t("products.productImport.tooLarge")
  else file.value = selected
}

function downloadTemplate() {
  downloadProductImportFile(buildProductImportTemplate(), t("products.productImport.templateFilename"))
}

function downloadErrors() {
  if (response.value)
    downloadProductImportFile(
      buildProductImportErrorCsv(response.value.lignes),
      t("products.productImport.errorFilename"),
    )
}
</script>

<template>
  <Dialog v-if="allowed" v-model:open="visible">
    <DialogTrigger as-child><slot name="trigger" /></DialogTrigger>
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-5xl" @open-auto-focus.prevent>
      <DialogHeader>
        <DialogTitle>{{ t("products.productImport.title") }}</DialogTitle>
        <DialogDescription>{{ t("products.productImport.description") }}</DialogDescription>
      </DialogHeader>

      <ProductsProductImportSetup
        v-if="runner.state.value === 'idle'"
        :file="file"
        :error-message="fileError"
        @select="selectFile"
        @template="downloadTemplate"
        @preview="file && runner.review(file)"
      />

      <div v-else-if="busy" role="status" class="flex min-h-52 flex-col items-center justify-center gap-3">
        <Icon name="ph:circle-notch" class="size-8 animate-spin text-primary" />
        <p class="font-medium">
          {{
            t(
              runner.state.value === "previewing"
                ? "products.productImport.checking"
                : "products.productImport.importing",
            )
          }}
        </p>
      </div>

      <ProductsProductImportReview
        v-else-if="response"
        :response="response"
        :result="isResult"
        @reset="runner.reset"
        @errors="downloadErrors"
        @apply="runner.apply"
        @done="visible = false"
      />

      <div v-else role="alert" class="space-y-4 rounded-xl bg-destructive/10 p-5 text-destructive">
        <p>{{ t("products.productImport.requestError") }}</p>
        <Button variant="outline" @click="runner.reset">{{ t("products.productImport.back") }}</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
