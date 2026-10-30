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
const { open, pending } = defineProps<{ open: boolean; pending: boolean }>()
const emit = defineEmits<{ "update:open": [value: boolean]; confirm: [] }>()
const { t } = useI18n({ useScope: "local" })
</script>
<template>
  <AlertDialog :open="open" @update:open="value => !pending && emit('update:open', value)">
    <AlertDialogContent>
      <AlertDialogHeader
        ><AlertDialogTitle>{{ t("title") }}</AlertDialogTitle
        ><AlertDialogDescription>{{ t("description") }}</AlertDialogDescription></AlertDialogHeader
      >
      <AlertDialogFooter>
        <Button
          variant="outline"
          :disabled="pending"
          data-testid="outbound-notifications-dispatch-cancel"
          @click="emit('update:open', false)"
          >{{ t("cancel") }}</Button
        >
        <Button :disabled="pending" data-testid="outbound-notifications-dispatch-confirm" @click="emit('confirm')">{{
          t(pending ? "pending" : "confirm")
        }}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
<i18n lang="json">
{
  "en": {
    "title": "Process the notification queue?",
    "description": "Up to 50 eligible messages may be sent to real recipients. This is not a preview. Cancel if you only want to inspect the queue.",
    "cancel": "Cancel",
    "confirm": "Confirm sending",
    "pending": "Processing…"
  },
  "fr": {
    "title": "Traiter la file de notifications ?",
    "description": "Jusqu’à 50 messages éligibles peuvent être envoyés à de vrais destinataires. Ce n’est pas un aperçu. Annulez pour consulter la file uniquement.",
    "cancel": "Annuler",
    "confirm": "Confirmer l’envoi",
    "pending": "Traitement…"
  }
}
</i18n>
