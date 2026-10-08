<script setup lang="ts">
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import { useCachedSession } from "@/composables/useCachedSession"
import { useDeleteProduitFiche } from "@/composables/useProduitMutations"
import { apiErrorText } from "@/utils/api-error"

/**
 * LA FICHE TECHNIQUE DU CONSTRUCTEUR, DANS L'EDITEUR PRODUIT.
 *
 * UN SEUL DOCUMENT, PAS UNE COLLECTION. Un produit a une fiche constructeur ;
 * en deposer une seconde remplace la premiere, et le backend efface l'ancien
 * fichier seulement une fois la ligne pointee sur le nouveau — un orphelin
 * coute quelques kilo-octets, un lien mort coute la confiance de qui clique.
 *
 * CE QU'ON MONTRE, ET CE QU'ON NE MONTRE PAS. La projection d'administration
 * rend le CHEMIN de stockage, pas une URL : on affiche donc la presence, le
 * nom et le poids, et c'est la page publique qui sert le telechargement.
 *
 * DIRECTION SEULEMENT. La route l'exige ; un comptoir qui verrait le bouton
 * recevrait un 403 sans comprendre pourquoi.
 */
const {
  productId,
  fichePdf,
  fichePdfNom,
  fichePdfOctets,
  disabled = false,
} = defineProps<{
  productId: number | null
  fichePdf: string | null
  fichePdfNom: string | null
  fichePdfOctets: number | null
  disabled?: boolean
}>()

const { t } = useI18n()
const session = useCachedSession()
const estDirection = computed(() => (session.value?.roles ?? []).includes("direction"))

const erreur = ref("")

const suppression = useDeleteProduitFiche(() => productId ?? 0)
const utilisable = computed(() => Boolean(productId) && estDirection.value && !disabled)

const poids = computed(() => {
  if (!fichePdfOctets) return ""
  const mo = fichePdfOctets / 1024 / 1024
  return mo >= 1 ? `${mo.toFixed(1)} Mo` : `${Math.max(1, Math.round(fichePdfOctets / 1024))} Ko`
})

async function retirer() {
  erreur.value = ""
  try {
    await suppression.mutateAsync()
  } catch (error: unknown) {
    erreur.value = apiErrorText(error, t)
  }
}
</script>

<template>
  <div data-testid="products-detail-datasheet" class="rounded-2xl bg-card p-4 space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h3 class="flex items-center gap-1.5 text-left font-medium">
        <Icon name="ph:file-pdf-duotone" size="24" />
        {{ t("products.datasheet.title") }}
      </h3>
      <ProductsDatasheetUploadDialog
        v-if="utilisable && productId"
        :product-id="productId"
        :replacing="Boolean(fichePdf)"
      />
    </div>

    <div v-if="fichePdf" class="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
      <span class="min-w-0">
        <span class="block truncate text-sm font-medium">{{ fichePdfNom ?? t("products.datasheet.untitled") }}</span>
        <span v-if="poids" class="block text-xs text-muted-foreground">{{ poids }}</span>
      </span>
      <Button
        v-if="utilisable"
        type="button"
        variant="ghost"
        size="sm"
        data-testid="products-detail-datasheet-delete"
        :disabled="suppression.isPending.value"
        @click="retirer"
      >
        <Spinner v-if="suppression.isPending.value" size="xs" />
        {{ t("products.datasheet.remove") }}
      </Button>
    </div>
    <p v-else class="text-sm text-muted-foreground">
      {{ t("products.datasheet.empty") }}
    </p>

    <p v-if="erreur" role="alert" class="text-sm text-destructive">
      {{ erreur }}
    </p>
  </div>
</template>
