<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (event: "confirm"): void
  (event: "update:open", value: boolean): void
}>()

const { t } = useI18n()
</script>

<template>
  <AlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <AlertDialogContent data-testid="team-discard-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("team.form.discardTitle") }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t("team.form.discardDescription") }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t("team.form.keepEditing") }}</AlertDialogCancel>
        <AlertDialogAction data-testid="team-discard-confirm" @click="emit('confirm')">
          {{ t("team.form.discardChanges") }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
