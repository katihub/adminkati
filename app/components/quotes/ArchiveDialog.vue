<script setup lang="ts">
import type { DevisDetail } from "@/types/api/devis"
import { computed, ref } from "vue"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useCachedSession } from "@/composables/useCachedSession"
import { useQuoteMutations } from "@/composables/useQuoteMutations"
import { apiErrorText } from "@/utils/api-error"

const { quote } = defineProps<{
  quote: DevisDetail
}>()

const emit = defineEmits<{
  archived: []
}>()

const { t } = useI18n()
const session = useCachedSession()
const mutation = useQuoteMutations()
const open = ref(false)
const errorMessage = ref("")
const isPending = computed(() => mutation.archive.isPending.value)
const ARCHIVE_ROLES = new Set<string>(["direction", "comptoir"])
const canArchive = computed(
  () => quote.statut !== "commande" && (session.value?.roles ?? []).some(role => ARCHIVE_ROLES.has(role)),
)

function archiveQuote() {
  errorMessage.value = ""
  mutation.archive.mutate(quote.reference, {
    onSuccess: () => {
      open.value = false
      emit("archived")
    },
    onError: (error: unknown) => {
      errorMessage.value = apiErrorText(error, t)
    },
  })
}
</script>

<template>
  <AlertDialog v-if="canArchive" v-model:open="open">
    <AlertDialogTrigger as-child>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        class="h-8 rounded-lg text-xs font-semibold px-3 flex items-center gap-1.5 shadow-none"
        data-testid="quotes-archive-trigger"
      >
        <Icon name="ph:archive-tray" size="15" aria-hidden="true" />
        {{ t("quotes.detail.archive.trigger") }}
      </Button>
    </AlertDialogTrigger>

    <AlertDialogContent data-testid="quotes-archive-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("quotes.detail.archive.title") }}</AlertDialogTitle>
        <AlertDialogDescription>{{
          t("quotes.detail.archive.description", { reference: quote.reference })
        }}</AlertDialogDescription>
      </AlertDialogHeader>

      <p v-if="errorMessage" class="text-sm text-destructive" data-testid="quotes-archive-error" role="alert">
        {{ errorMessage }}
      </p>

      <AlertDialogFooter>
        <AlertDialogCancel data-testid="quotes-archive-cancel" :disabled="isPending">
          {{ t("quotes.detail.archive.cancel") }}
        </AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          data-testid="quotes-archive-confirm"
          :disabled="isPending"
          :aria-busy="isPending ? true : undefined"
          @click="archiveQuote"
        >
          <Spinner v-if="isPending" data-icon="inline-start" />
          {{ t("quotes.detail.archive.confirm") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
