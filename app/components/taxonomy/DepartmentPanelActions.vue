<script setup lang="ts">
import type { Rayon } from "@/types/api/taxonomie"
import { Button } from "@/components/ui/button"

defineProps<{
  department: Rayon | null
  creating: boolean
  editing: boolean
  dirty: boolean
  pending: boolean
}>()
const emit = defineEmits<{
  edit: []
  cancel: []
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
        form="department-form"
        :disabled="pending || (!creating && !dirty)"
        data-testid="department-panel-save"
      >
        {{ t("taxonomy.departments.save") }}
      </Button>
    </template>
    <template v-else-if="department">
      <Button variant="outline" :disabled="pending" data-testid="department-panel-edit" @click="emit('edit')">
        {{ t("taxonomy.panel.edit") }}
      </Button>
      <Button variant="destructive" :disabled="pending" data-testid="department-panel-delete" @click="emit('remove')">
        {{ t("taxonomy.panel.delete") }}
      </Button>
    </template>
  </div>
</template>
