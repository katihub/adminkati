<script setup lang="ts">
import { computed, ref, useId, watch } from "vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUploadProduitFiche } from "@/composables/useProduitMutations"
import { apiErrorText } from "@/utils/api-error"

const { productId, replacing = false } = defineProps<{
  productId: number
  replacing?: boolean
}>()

const MAX_OCTETS = 25 * 1024 * 1024

const { t } = useI18n()

const open = ref(false)
const fichier = ref<File | null>(null)
const erreur = ref("")
const fichierId = useId()

const upload = useUploadProduitFiche(() => productId)
const enCours = computed(() => upload.isPending.value)
const titre = computed(() => t(replacing ? "products.datasheet.replace" : "products.datasheet.upload"))

/** Each opening starts blank: a file or error left by a cancelled attempt must not come back. */
watch(open, value => {
  if (value) {
    fichier.value = null
    erreur.value = ""
  }
})

function choisir(event: Event) {
  const choisi = (event.target as HTMLInputElement).files?.[0] ?? null
  fichier.value = null
  erreur.value = ""
  if (!choisi) return

  // Type and size both come from the file: the two limits the backend enforces on its
  // side, checked here to avoid a needless round trip.
  if (choisi.type !== "application/pdf") {
    erreur.value = t("products.datasheet.errorType")
    return
  }
  if (choisi.size > MAX_OCTETS) {
    erreur.value = t("products.datasheet.errorSize")
    return
  }
  fichier.value = choisi
}

function deposer() {
  if (!fichier.value) return
  erreur.value = ""
  upload.mutate(fichier.value, {
    onSuccess: () => {
      open.value = false
    },
    onError: (error: unknown) => {
      erreur.value = apiErrorText(error, t)
    },
  })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button type="button" variant="secondary" size="sm" data-testid="products-detail-datasheet-upload">
        <Icon name="ph:upload-simple" aria-hidden="true" />
        {{ titre }}
      </Button>
    </DialogTrigger>

    <DialogContent data-testid="products-detail-datasheet-dialog">
      <form class="grid gap-6" novalidate @submit.prevent="deposer">
        <DialogHeader>
          <DialogTitle>{{ titre }}</DialogTitle>
          <DialogDescription>{{ t("products.datasheet.hint") }}</DialogDescription>
        </DialogHeader>

        <div class="space-y-1.5">
          <Label :for="fichierId" class="text-xs font-semibold text-muted-foreground">
            {{ t("products.datasheet.fileLabel") }}
          </Label>
          <Input
            :id="fichierId"
            type="file"
            accept="application/pdf"
            data-testid="products-detail-datasheet-input"
            :disabled="enCours"
            @change="choisir"
          />
        </div>

        <p
          v-if="erreur"
          data-testid="products-detail-datasheet-upload-error"
          role="alert"
          class="text-sm text-destructive"
        >
          {{ erreur }}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" data-testid="products-detail-datasheet-cancel" @click="open = false">
            {{ t("products.datasheet.cancel") }}
          </Button>
          <Button type="submit" data-testid="products-detail-datasheet-submit" :disabled="!fichier || enCours">
            <Spinner v-if="enCours" data-icon="inline-start" />
            {{ t("products.datasheet.submit") }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
