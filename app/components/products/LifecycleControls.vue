<script setup lang="ts">
import type { ProductDetail } from "@/types/api/produits"
import { computed, ref } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { useRestoreProduit } from "@/composables/useProduitMutations"
import { apiErrorText } from "@/utils/api-error"

const { product } = defineProps<{ product: ProductDetail }>()

const { t } = useI18n()

const isWithdrawn = computed(() => product.retire_le != null)

const restoreMutation = useRestoreProduit(computed(() => product.id))
const isRestoring = computed(() => restoreMutation.isPending.value)
const isRestoringAriaBusy = computed<true | undefined>(() => (isRestoring.value ? true : undefined))
const submitError = ref("")

function onRestore() {
  submitError.value = ""
  restoreMutation.mutate(undefined, {
    onSuccess: restored => {
      toast.success(t("products.toast.restoreSuccess", { name: restored.nom }))
    },
    onError: (error: unknown) => {
      submitError.value = apiErrorText(error, t)
    },
  })
}
</script>

<template>
  <div class="flex items-center gap-3">
    <ProductsWithdrawDialog v-if="!isWithdrawn" :product-id="product.id" :product-name="product.nom" />

    <template v-else>
      <Button
        type="button"
        variant="secondary"
        data-testid="products-detail-form-restore"
        :disabled="isRestoring"
        :aria-busy="isRestoringAriaBusy"
        class="bg-info/10 text-info hover:text-info"
        @click="onRestore"
      >
        <Spinner v-if="isRestoring" data-icon="inline-start" />
        <Icon v-else name="ph:arrow-counter-clockwise" size="16" aria-hidden="true" />
        {{ t("products.lifecycleControls.restore") }}
      </Button>
      <p
        v-if="submitError"
        data-testid="products-detail-form-restore-error"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ submitError }}
      </p>
    </template>
  </div>
</template>
