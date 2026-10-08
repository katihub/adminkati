<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

const { changes } = defineProps<{
  changes: number
}>()

const emit = defineEmits<{ discard: [] }>()

const open = defineModel<boolean>("open", { required: true })

const { t } = useI18n()
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent data-testid="points-of-sale-leave-dialog" class="sm:max-w-md">
      <AlertDialogHeader class="items-center text-center">
        <AlertDialogTitle>{{ t("pointsOfSale.drawer.leaveTitle") }}</AlertDialogTitle>
        <AlertDialogDescription>{{
          t("pointsOfSale.drawer.leaveDescription", { count: changes }, changes)
        }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter class="sm:grid sm:grid-cols-2">
        <Button variant="outline" data-testid="points-of-sale-leave-discard" @click="emit('discard')">
          {{ t("pointsOfSale.drawer.discard") }}
        </Button>
        <Button data-testid="points-of-sale-leave-keep" @click="open = false">
          {{ t("pointsOfSale.drawer.keepEditing") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
