<script setup lang="ts">
import { ref } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { apiErrorText } from "@/utils/api-error"
import { downloadBlob } from "@/utils/download-file"
import { filenameFromDisposition } from "@/utils/stock-export"

// Products and photo links of a shop, whatever its state: a suspended or excluded
// shop keeps everything it published, and the direction can take it back as CSV.
defineProps<{ shops: Array<{ id: string; nom: string; statut: string }> }>()

const { t } = useI18n()
const downloading = ref<string | null>(null)

async function download(shop: { id: string; nom: string }) {
  if (downloading.value) return
  downloading.value = shop.id
  try {
    const response = await $fetch.raw<Blob>(
      `/api/v1/marketplace/reputation/boutiques/${encodeURIComponent(shop.id)}/catalogue/export`,
      { responseType: "blob", retry: 0 },
    )
    downloadBlob(
      response._data as Blob,
      filenameFromDisposition(response.headers.get("content-disposition"), `catalogue-${shop.id}.csv`),
    )
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  } finally {
    downloading.value = null
  }
}
</script>

<template>
  <section class="rounded-lg border border-border bg-card p-4" data-testid="seller-catalogue-export">
    <h3 class="font-heading text-base font-semibold">{{ t("operations.trust.export.title") }}</h3>
    <p class="mt-1 text-sm text-muted-foreground">{{ t("operations.trust.export.help") }}</p>
    <ul class="mt-3 divide-y divide-border">
      <li v-for="shop in shops" :key="shop.id" class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <span
          >{{ shop.nom }}
          <span class="text-xs text-muted-foreground"
            >· {{ t(`operations.trust.shopStatus.${shop.statut}`) }}</span
          ></span
        >
        <Button
          size="sm"
          variant="outline"
          :disabled="downloading !== null"
          :data-testid="`seller-catalogue-export-${shop.id}`"
          @click="download(shop)"
          ><Icon name="ph:download-simple" /> {{ t("operations.trust.export.download") }}</Button
        >
      </li>
    </ul>
  </section>
</template>
