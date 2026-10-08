<script setup lang="ts">
import type { StockImportMode } from "@/types/stock-import"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useStockImportRun } from "@/composables/useStockImportRun"
import { stockImportSetupSchema } from "@/schemas/stock-import"
import {
  buildStockImportErrorCsv,
  buildStockImportTemplate,
  downloadStockImportFile,
  STOCK_IMPORT_MAX_BYTES,
} from "@/utils/stock-import-files"
import { stockImportHeading } from "@/utils/stock-import-heading"

const open = defineModel<boolean>("open", { default: false })
const { t } = useI18n()
const session = useCachedSession()
const allowed = computed(() => session.value?.roles.includes("direction") ?? false)
const runner = useStockImportRun()
const heading = computed(() =>
  stockImportHeading({
    stage: runner.stage.value,
    preview: runner.preview.value,
    result: runner.result.value,
    failure: runner.failure.value,
    phase: runner.failurePhase.value ?? "apply",
  }),
)
const isSubmitting = computed(() => runner.state.value === "submitting")
const visible = computed({
  get: () => open.value && allowed.value,
  set: value => {
    if (isSubmitting.value) return
    // A preview writes nothing, so closing mid-flight just abandons it.
    if (!value) runner.cancelPreview()
    open.value = value
  },
})
const mode = ref<StockImportMode>("reception")
const motif = ref("")
const file = ref<File | null>(null)
const errorMessage = ref("")
const canSubmit = computed(
  () => file.value && stockImportSetupSchema.safeParse({ mode: mode.value, motif: motif.value }).success,
)

function blockWhileSubmitting(event: { preventDefault: () => void }) {
  if (isSubmitting.value) event.preventDefault()
}
watch(visible, value => {
  // A pending same-key retry must outlive close and reopen, or a lost response could be re-imported under a new key.
  if (!value || runner.canRetry.value) return
  mode.value = "reception"
  motif.value = ""
  file.value = null
  errorMessage.value = ""
  runner.reset()
})
function selectFile(selected: File | undefined) {
  file.value = null
  errorMessage.value = ""
  if (!selected) return
  if (!/\.(csv|xlsx)$/i.test(selected.name)) errorMessage.value = t("products.stockImport.parse.wrongType")
  else if (selected.size > STOCK_IMPORT_MAX_BYTES) errorMessage.value = t("products.stockImport.parse.tooLarge")
  else file.value = selected
}
async function review() {
  if (!canSubmit.value || !file.value || !allowed.value) return
  await runner.review({ file: file.value, mode: mode.value, motif: motif.value })
}
async function apply() {
  await runner.apply()
  const result = runner.result.value
  if (result && !result.echouees) toast.success(t("products.stockImport.success", { count: result.appliquees }))
}
function template() {
  downloadStockImportFile(buildStockImportTemplate(mode.value), t("products.stockImport.templateFilename"))
}
function errors() {
  const response = runner.result.value ?? runner.preview.value
  if (response)
    downloadStockImportFile(buildStockImportErrorCsv(response.lignes), t("products.stockImport.errorFilename"))
}
</script>

<template>
  <Dialog v-if="allowed" v-model:open="visible">
    <DialogTrigger as-child>
      <slot name="trigger"
        ><Button variant="outline"
          ><Icon name="ph:upload-simple" aria-hidden="true" />{{ t("products.stockImport.title") }}</Button
        ></slot
      >
    </DialogTrigger>
    <DialogContent
      class="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
      @open-auto-focus.prevent
      @escape-key-down="blockWhileSubmitting"
      @interact-outside="blockWhileSubmitting"
    >
      <DialogHeader>
        <DialogTitle>{{ t(`products.stockImport.headings.${heading.id}.title`, heading.params) }}</DialogTitle>
        <DialogDescription>{{
          t(`products.stockImport.headings.${heading.id}.description`, heading.params)
        }}</DialogDescription>
      </DialogHeader>
      <ProductsStockImportProgress
        v-if="runner.stage.value === 'submitting'"
        :label="t('products.stockImport.submitting')"
      />
      <ProductsStockImportProgress
        v-else-if="runner.stage.value === 'previewing'"
        :label="t('products.stockImport.previewing')"
      />
      <ProductsStockImportPreview
        v-else-if="runner.stage.value === 'preview'"
        :preview="runner.preview.value!"
        @back="runner.reset"
        @download="errors"
        @apply="apply"
        @include-changed="runner.setIncludeChanged"
      />
      <ProductsStockImportResult
        v-else-if="runner.stage.value === 'result'"
        :result="runner.result.value!"
        @download="errors"
        @done="visible = false"
      />
      <ProductsStockImportRequestError
        v-else-if="runner.stage.value === 'failed'"
        :failure="runner.failure.value!"
        :phase="runner.failurePhase.value ?? 'apply'"
        @retry="runner.retry"
        @back="runner.reset"
      />
      <ProductsStockImportSetup
        v-else
        v-model:mode="mode"
        v-model:motif="motif"
        :file="file"
        :error-message="errorMessage"
        :can-submit="Boolean(canSubmit)"
        @select="selectFile"
        @template="template"
        @submit="review"
        @cancel="visible = false"
      />
    </DialogContent>
  </Dialog>
</template>
