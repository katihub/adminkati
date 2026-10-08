<script setup lang="ts">
import { toRefs } from "vue"
import { Input } from "@/components/ui/input"

const props = defineProps<{
  descriptions: string[]
  draft: string
  inputId: string
  disabled?: boolean
  draftDisabled?: boolean
  generating?: boolean
}>()
const emit = defineEmits<{
  "update:description": [index: number, value: string]
  "update:draft": [value: string]
  add: []
  remove: [index: number]
}>()
const { descriptions, draft, inputId, disabled, draftDisabled, generating } = toRefs(props)

const { t } = useI18n()

function updateDescription(index: number, value: unknown) {
  emit("update:description", index, String(value))
}

function updateDraft(value: unknown) {
  emit("update:draft", String(value))
}
</script>

<template>
  <div
    data-testid="products-detail-overview-features-card"
    class="space-y-4 rounded-2xl bg-card p-4"
    :class="generating && 'ai-generating'"
  >
    <h3 class="flex items-center gap-1.5 text-left text-lg font-medium">
      <Icon name="ph:list-bullets-duotone" size="24" aria-hidden="true" />
      {{ t("products.overview.featuresTitle") }}
    </h3>
    <div class="flex flex-col gap-2">
      <div v-for="(description, index) in descriptions" :key="index" class="flex items-center gap-2">
        <Input
          :model-value="description"
          :aria-label="t('products.overview.featureInputLabel', { index: index + 1 })"
          :disabled="disabled"
          class="w-auto flex-1 text-sm text-muted-foreground border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 rounded-none shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:border-primary focus-visible:ring-0"
          @update:model-value="updateDescription(index, $event)"
        />
        <button
          type="button"
          :disabled="disabled"
          :aria-label="t('products.detailForm.caracteristiques.remove', { value: description })"
          class="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          @click="emit('remove', index)"
        >
          <Icon name="ph:x" size="12" aria-hidden="true" />
        </button>
      </div>
      <Input
        :id="inputId"
        :model-value="draft"
        :aria-label="t('products.overview.nextFeatureLabel')"
        :placeholder="t('products.detailForm.caracteristiques.placeholder')"
        :disabled="draftDisabled"
        class="text-sm text-muted-foreground border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 rounded-none shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:ring-0"
        @update:model-value="updateDraft"
        @blur="emit('add')"
        @keydown.enter.prevent="emit('add')"
      />
    </div>
    <slot name="suggestion" />
  </div>
</template>
