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
  name: string
  pending: boolean
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
    <AlertDialogContent data-testid="team-deactivate-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("team.deactivate.title", { name: props.name }) }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t("team.deactivate.description") }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="pending">
          {{ t("team.deactivate.cancel") }}
        </AlertDialogCancel>
        <AlertDialogAction :disabled="pending" data-testid="team-deactivate-confirm" @click="emit('confirm')">
          {{ t("team.deactivate.confirm") }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
