<script setup lang="ts">
import type { Categorie } from "@/types/api/taxonomie"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

defineProps<{ open: boolean; category: Categorie | null; pending: boolean; error?: unknown }>()
const emit = defineEmits<{ "update:open": [value: boolean]; confirm: [] }>()
const { t } = useI18n()
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent data-testid="category-delete-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("taxonomy.delete.title") }}</AlertDialogTitle>
        <AlertDialogDescription>{{
          t("taxonomy.delete.description", { name: category?.nom ?? "" })
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
          data-testid="category-delete-confirm"
          @click="emit('confirm')"
        >
          {{ t("taxonomy.delete.confirm") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
