<script setup lang="ts">
import type { Categorie } from "@/types/api/taxonomie"
import { Button } from "@/components/ui/button"

defineProps<{
  category: Categorie | null
  creating: boolean
  editing: boolean
  dirty: boolean
  pending: boolean
}>()
const emit = defineEmits<{
  edit: []
  cancel: []
  visibility: [value: boolean]
  remove: []
}>()
const { t } = useI18n()
</script>

<template>
  <div class="flex gap-2">
    <template v-if="creating || editing">
      <Button variant="outline" :disabled="pending" @click="emit('cancel')">
        {{ t("taxonomy.panel.cancel") }}
      </Button>
      <Button
        type="submit"
        form="category-form"
        :disabled="pending || (!creating && !dirty)"
        data-testid="category-panel-save"
      >
        {{ t("taxonomy.form.save") }}
      </Button>
    </template>
    <template v-else-if="category">
      <Button variant="outline" :disabled="pending" data-testid="category-panel-edit" @click="emit('edit')">
        {{ t("taxonomy.panel.edit") }}
      </Button>
      <Button
        variant="outline"
        :disabled="pending"
        data-testid="category-panel-visibility"
        @click="emit('visibility', !category.masquee)"
      >
        {{ category.masquee ? t("taxonomy.panel.show") : t("taxonomy.panel.hide") }}
      </Button>
      <Button variant="destructive" :disabled="pending" data-testid="category-panel-delete" @click="emit('remove')">
        {{ t("taxonomy.panel.delete") }}
      </Button>
    </template>
  </div>
</template>
