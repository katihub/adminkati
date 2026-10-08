<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useId } from "vue"
import { cn } from "@/lib/utils"
import { useAiGenerationStore } from "@/stores/ai-generation"
import { PRODUCT_COPY_FIELDS, PRODUCT_COPY_IMAGE_PROFILES, PRODUCT_COPY_LANGUAGES } from "@/types/ai/product-copy"

const { t } = useI18n()
const store = useAiGenerationStore()
const { preferredFields, preferredImageProfile, preferredLanguage } = storeToRefs(store)
const labelId = useId()
const descriptionId = useId()
const fieldsLabelId = useId()
const fieldsDescriptionId = useId()
const imageProfileLabelId = useId()
const imageProfileDescriptionId = useId()

function toggleField(field: (typeof PRODUCT_COPY_FIELDS)[number]) {
  const next = preferredFields.value.includes(field)
    ? preferredFields.value.filter(selected => selected !== field)
    : [...preferredFields.value, field]
  store.setPreferredFields(next)
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
    <div class="flex flex-col gap-1">
      <h3 :id="labelId" class="text-sm font-medium">{{ t("products.aiCopy.popup.settings.language.label") }}</h3>
      <p :id="descriptionId" class="text-xs text-muted-foreground">
        {{ t("products.aiCopy.popup.settings.language.description") }}
      </p>
    </div>
    <div
      role="group"
      :aria-labelledby="labelId"
      :aria-describedby="descriptionId"
      class="flex w-fit items-center rounded-lg bg-muted p-0.5"
    >
      <button
        v-for="code in PRODUCT_COPY_LANGUAGES"
        :key="code"
        type="button"
        :data-testid="`ai-generation-language-${code}`"
        :aria-pressed="preferredLanguage === code"
        :class="
          cn(
            'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground capitalize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            preferredLanguage === code && 'bg-background text-foreground shadow-sm',
          )
        "
        @click="store.setPreferredLanguage(code)"
      >
        {{ t(`products.aiCopy.language.${code}`) }}
      </button>
    </div>
    <div class="flex flex-col gap-1 pt-3">
      <h3 :id="fieldsLabelId" class="text-sm font-medium">{{ t("products.aiCopy.popup.settings.fields.label") }}</h3>
      <p :id="fieldsDescriptionId" class="text-xs text-muted-foreground">
        {{ t("products.aiCopy.popup.settings.fields.description") }}
      </p>
    </div>
    <div
      role="group"
      :aria-labelledby="fieldsLabelId"
      :aria-describedby="fieldsDescriptionId"
      class="grid gap-2 sm:grid-cols-2"
    >
      <button
        v-for="field in PRODUCT_COPY_FIELDS"
        :key="field"
        type="button"
        :data-testid="`ai-generation-field-${field}`"
        :aria-pressed="preferredFields.includes(field)"
        :disabled="preferredFields.length === 1 && preferredFields.includes(field)"
        :class="
          cn(
            'rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            preferredFields.includes(field)
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border text-muted-foreground',
            preferredFields.length === 1 && preferredFields.includes(field) && 'cursor-not-allowed',
          )
        "
        @click="toggleField(field)"
      >
        {{ t(`products.aiCopy.card.fields.${field}`) }}
      </button>
    </div>
    <div class="flex flex-col gap-1 pt-3">
      <h3 :id="imageProfileLabelId" class="text-sm font-medium">
        {{ t("products.aiCopy.popup.settings.imageProfile.label") }}
      </h3>
      <p :id="imageProfileDescriptionId" class="text-xs text-muted-foreground">
        {{ t("products.aiCopy.popup.settings.imageProfile.description") }}
      </p>
    </div>
    <div
      role="group"
      :aria-labelledby="imageProfileLabelId"
      :aria-describedby="imageProfileDescriptionId"
      class="flex flex-col gap-2"
    >
      <button
        v-for="profile in PRODUCT_COPY_IMAGE_PROFILES"
        :key="profile"
        type="button"
        :data-testid="`ai-generation-image-profile-${profile}`"
        :aria-pressed="preferredImageProfile === profile"
        :class="
          cn(
            'rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            preferredImageProfile === profile
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border text-muted-foreground',
          )
        "
        @click="store.setPreferredImageProfile(profile)"
      >
        <span class="block font-medium">{{
          t(`products.aiCopy.popup.settings.imageProfile.options.${profile}.label`)
        }}</span>
        <span class="block pt-0.5 text-xs text-muted-foreground">
          {{ t(`products.aiCopy.popup.settings.imageProfile.options.${profile}.description`) }}
        </span>
      </button>
    </div>
  </div>
</template>
