<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { SheetFooter } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"

/** Save/Cancel — and the active/published toggle — for `BannerForm.vue`, extracted out
 *  of `BannerPanel.vue`'s template to keep it under the repository's complexity gate —
 *  same reasoning as the Phase 5 `BannerDraggableGrid.vue`/`BannerStaticGrid.vue` split.
 *  Buttons associate to the form by `formId` (the `form` attribute) rather than DOM
 *  nesting, since they live in the panel's footer, not inside the form itself; `active`
 *  is plain two-way state instead, mirroring the view-mode publish toggle in
 *  `BannerPanel.vue`'s own footer rather than the `form`-attribute wiring. */
defineProps<{
  formId: string
  saveDisabled: boolean
  isSaving: boolean
  submitError: string
  active: boolean
}>()

const emit = defineEmits<{ "update:active": [value: boolean] }>()

const { t } = useI18n()
</script>

<template>
  <SheetFooter data-testid="banner-panel-form-actions" class="gap-3 border-t border-border">
    <p v-if="submitError" data-testid="banner-form-submit-error" role="alert" class="text-sm text-destructive">
      {{ submitError }}
    </p>
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Switch
          data-testid="banner-form-active"
          :model-value="active"
          :disabled="isSaving"
          @update:model-value="value => emit('update:active', value)"
        />
        <span class="text-sm text-muted-foreground">{{ t("content.banners.form.activeLabel") }}</span>
      </div>

      <div class="flex items-center gap-2">
        <Button type="reset" variant="secondary" :form="formId" data-testid="banner-form-cancel" :disabled="isSaving">
          {{ t("content.banners.form.cancel") }}
        </Button>
        <Button
          type="submit"
          :form="formId"
          data-testid="banner-form-save"
          :disabled="saveDisabled"
          :aria-busy="isSaving || undefined"
        >
          <Spinner v-if="isSaving" data-icon="inline-start" />
          {{ t("content.banners.form.save") }}
        </Button>
      </div>
    </div>
  </SheetFooter>
</template>
