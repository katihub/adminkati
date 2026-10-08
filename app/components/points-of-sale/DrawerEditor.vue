<script setup lang="ts">
import type { PointVenteAdmin } from "@/types/api/vitrine"
import type { PointVenteSection } from "@/utils/point-of-sale"
import { computed, ref, useId, useTemplateRef } from "vue"
import { ScrollArea } from "@/components/ui/scroll-area"

const props = defineProps<{
  point: PointVenteAdmin | null
  nextPosition: number
  section: PointVenteSection | null
}>()

const emit = defineEmits<{
  close: []
  created: [id: number]
  saved: []
}>()

const { t } = useI18n()

interface FormHandle {
  active: boolean
  changedCount: number
  isDirty: boolean
  isSaving: boolean
  submitError: string
}

const formId = useId()
const form = useTemplateRef<FormHandle>("form")
const isCreate = computed(() => props.point === null)
const changes = computed(() => form.value?.changedCount ?? 0)

function createHeader() {
  return {
    title: t("pointsOfSale.panel.newTitle"),
    status: t("pointsOfSale.drawer.notSavedAt", { position: props.nextPosition }),
  }
}

function editHeader() {
  return {
    title: props.point?.libelle ?? "",
    status: changes.value
      ? t("pointsOfSale.drawer.unsaved", { count: changes.value }, changes.value)
      : t("pointsOfSale.drawer.noChanges"),
  }
}

const header = computed(() => (isCreate.value ? createHeader() : editHeader()))

const active = computed({
  get: () => form.value?.active ?? true,
  set: (value: boolean) => {
    if (form.value) form.value.active = value
  },
})

const leaveOpen = ref(false)

function requestClose() {
  if (form.value?.isDirty) leaveOpen.value = true
  else emit("close")
}

function discard() {
  leaveOpen.value = false
  emit("close")
}

defineExpose({ requestClose })
</script>

<template>
  <PointsOfSaleEditorHeader
    v-model:active="active"
    :title="header.title"
    :status="header.status"
    :pending="isCreate || changes > 0"
    :is-saving="form?.isSaving ?? false"
    @cancel="requestClose"
  />

  <div v-if="form?.submitError" class="px-8 pt-5">
    <p data-testid="points-of-sale-form-submit-error" role="alert" class="text-sm text-destructive">
      {{ form.submitError }}
    </p>
  </div>

  <ScrollArea class="min-h-0 flex-1">
    <div class="mx-auto w-full max-w-3xl px-6 py-6 @3xl:px-8">
      <PointsOfSaleForm
        ref="form"
        :point="point"
        :form-id="formId"
        :section="section"
        @saved="emit('saved')"
        @created="id => emit('created', id)"
      />
    </div>
  </ScrollArea>

  <PointsOfSaleLeaveDialog v-model:open="leaveOpen" :changes="changes" @discard="discard" />
</template>
