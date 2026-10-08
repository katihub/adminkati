<script setup lang="ts">
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
import { useCaisseMutations } from "@/composables/useCaisse"
import { apiErrorText } from "@/utils/api-error"
import { formatMontant } from "@/utils/money"

const {
  caisseId,
  montantAttendu,
  montantCompte,
  ecart,
  counterName,
  disabled = false,
  disabledReason = null,
} = defineProps<{
  caisseId: string
  montantAttendu: number
  montantCompte: number | null
  ecart: number | null
  counterName: string | null
  disabled?: boolean
  disabledReason?: string | null
}>()

const { t, locale } = useI18n()
const open = ref(false)
const errorMessage = ref("")
const mutation = useCaisseMutations()
const isPending = computed(() => mutation.validate.isPending.value)

const expectedText = computed(() => formatMontant(montantAttendu, locale.value).affiche)
const countedText = computed(() => (montantCompte === null ? "—" : formatMontant(montantCompte, locale.value).affiche))
const gapText = computed(() => (ecart === null ? "—" : formatMontant(ecart, locale.value).affiche))

function confirmValidate() {
  errorMessage.value = ""
  mutation.validate.mutate(caisseId, {
    onSuccess: () => {
      open.value = false
    },
    onError: (error: unknown) => {
      errorMessage.value = apiErrorText(error, t)
    },
  })
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger as-child>
      <Button
        type="button"
        data-testid="caisse-validate-dialog-trigger"
        :disabled="disabled"
        :title="disabled ? (disabledReason ? t(disabledReason) : undefined) : undefined"
      >
        <Icon name="ph:seal-check" size="18" aria-hidden="true" />
        {{ t("caisse.detail.validateTrigger") }}
      </Button>
    </AlertDialogTrigger>

    <AlertDialogContent data-testid="caisse-validate-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("caisse.detail.validateDialog.title") }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t("caisse.detail.validateDialog.description") }}</AlertDialogDescription>
      </AlertDialogHeader>

      <dl class="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt class="text-xs text-muted-foreground">
            {{ t("caisse.detail.expected") }}
          </dt>
          <dd data-testid="caisse-validate-dialog-expected" class="font-medium text-foreground">
            {{ expectedText }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">
            {{ t("caisse.detail.counted") }}
          </dt>
          <dd data-testid="caisse-validate-dialog-counted" class="font-medium text-foreground">
            {{ countedText }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">
            {{ t("caisse.detail.gap") }}
          </dt>
          <dd data-testid="caisse-validate-dialog-gap" class="font-medium text-foreground">
            {{ gapText }}
          </dd>
        </div>
      </dl>

      <p v-if="counterName" class="text-xs text-muted-foreground">
        {{ t("caisse.detail.countedBy") }} <span class="font-medium text-foreground">{{ counterName }}</span>
      </p>

      <p v-if="errorMessage" data-testid="caisse-validate-dialog-error" role="alert" class="text-sm text-destructive">
        {{ errorMessage }}
      </p>

      <AlertDialogFooter>
        <AlertDialogCancel data-testid="caisse-validate-dialog-cancel" :disabled="isPending">
          {{ t("caisse.detail.validateDialog.cancel") }}
        </AlertDialogCancel>
        <Button
          type="button"
          data-testid="caisse-validate-dialog-confirm"
          :disabled="isPending"
          :aria-busy="isPending ? true : undefined"
          @click="confirmValidate"
        >
          <Spinner v-if="isPending" data-icon="inline-start" />
          {{ t("caisse.detail.validateDialog.confirm") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
