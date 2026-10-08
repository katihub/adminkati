<script setup lang="ts">
import type { Rayon } from "@/types/api/taxonomie"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

defineProps<{ open: boolean; department: Rayon | null; pending: boolean; error?: unknown }>()
const emit = defineEmits<{ "update:open": [value: boolean]; confirm: [] }>()
const { t } = useI18n()
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent data-testid="department-delete-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("taxonomy.departments.deleteTitle") }}</AlertDialogTitle>
        <AlertDialogDescription>{{
          t("taxonomy.departments.deleteDescription", { name: department?.nom ?? "" })
        }}</AlertDialogDescription>
      </AlertDialogHeader>
      <ApiErrorCard v-if="error" :error="error" />
      <AlertDialogFooter>
        <Button variant="outline" :disabled="pending" @click="emit('update:open', false)">
          {{ t("taxonomy.delete.cancel") }}
        </Button>
        <Button
          variant="destructive"
          :disabled="pending"
          data-testid="department-delete-confirm"
          @click="emit('confirm')"
        >
          {{ t("taxonomy.departments.deleteConfirm") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
