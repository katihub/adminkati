<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiErrorText } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"

/**
 * A shop's logo, banner and public phone, as customers see them. They are published without
 * moderation; the direction can take an unsuitable visual down, with a reason kept in the journal.
 */
type Visual = "logo" | "banniere"
const { shop, sellerId, canRemove } = defineProps<{
  shop: { id: string; nom: string; logoUrl?: string | null; banniereUrl?: string | null; telephone?: string | null }
  sellerId: string
  canRemove: boolean
}>()
const { t } = useI18n({ useScope: "local" })
const apiWrite = useApiWrite()
const queryClient = useQueryClient()
const removing = ref<Visual | null>(null)
/* Static keys, so the translation checks can follow them. */
const label = (type: Visual) => (type === "logo" ? t("logo") : t("banniere"))
const altOf = (type: Visual) =>
  type === "logo" ? t("logoOf", { name: shop.nom }) : t("banniereOf", { name: shop.nom })
const removeLabel = (type: Visual) => (type === "logo" ? t("removeLogo") : t("removeBanner"))
const removedLabel = (type: Visual) => (type === "logo" ? t("removedLogo") : t("removedBanner"))
const reason = ref("")
const visuals = computed(() =>
  (["logo", "banniere"] as const).map(type => ({ type, url: type === "logo" ? shop.logoUrl : shop.banniereUrl })),
)
const remove = useMutation({
  mutationFn: ({ type, motif }: { type: Visual; motif: string }) =>
    apiWrite(`/vendeurs/boutiques/${encodeURIComponent(shop.id)}/visuels/${type}/retrait`, {
      method: "POST",
      body: { motif },
    }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceModeration.seller(sellerId) }),
})

function open(type: Visual) {
  reason.value = ""
  removing.value = type
}

async function confirm() {
  const type = removing.value
  if (!type || reason.value.trim().length < 5) return
  try {
    await remove.mutateAsync({ type, motif: reason.value.trim() })
    toast.success(removedLabel(type))
    removing.value = null
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-[auto_1fr]" :data-testid="`shop-visuals-${shop.id}`">
    <div v-for="visual in visuals" :key="visual.type" class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">{{ label(visual.type) }}</span>
      <img
        v-if="visual.url"
        :src="visual.url"
        :alt="altOf(visual.type)"
        class="rounded-lg border border-border bg-white"
        :class="visual.type === 'logo' ? 'size-20 object-contain' : 'h-20 w-full max-w-72 object-cover'"
        loading="lazy"
      />
      <span v-else class="text-sm text-muted-foreground">{{ t("none") }}</span>
      <Button
        v-if="visual.url && canRemove"
        size="sm"
        variant="outline"
        class="self-start text-destructive"
        :data-testid="`shop-visual-remove-${visual.type}`"
        @click="open(visual.type)"
        >{{ removeLabel(visual.type) }}</Button
      >
    </div>
    <div class="flex flex-col gap-1 sm:col-span-2">
      <span class="text-xs text-muted-foreground">{{ t("phone") }}</span>
      <span class="text-sm">{{ shop.telephone || "—" }}</span>
    </div>

    <Dialog :open="Boolean(removing)" @update:open="value => (value ? undefined : (removing = null))">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ removing ? removeLabel(removing) : "" }}</DialogTitle>
          <DialogDescription>{{ t("help", { name: shop.nom }) }}</DialogDescription>
        </DialogHeader>
        <form class="flex flex-col gap-3" @submit.prevent="confirm">
          <Label :for="`visual-reason-${shop.id}`">{{ t("reason") }}</Label>
          <Textarea
            :id="`visual-reason-${shop.id}`"
            v-model="reason"
            rows="3"
            maxlength="300"
            data-testid="shop-visual-reason"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" @click="removing = null">{{ t("cancel") }}</Button>
            <Button
              type="submit"
              variant="destructive"
              :disabled="reason.trim().length < 5 || remove.isPending.value"
              data-testid="shop-visual-confirm"
              >{{ t("confirm") }}</Button
            >
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "logo": "Logo",
    "banniere": "Banner",
    "logoOf": "Logo of {name}",
    "banniereOf": "Banner of {name}",
    "none": "None",
    "phone": "Public phone",
    "removeLogo": "Remove the logo",
    "removeBanner": "Remove the banner",
    "removedLogo": "Logo removed.",
    "removedBanner": "Banner removed.",
    "help": "The visual disappears at once from {name}'s pages; the shop can upload another one. The reason is kept in the journal.",
    "reason": "Reason (5 characters minimum)",
    "cancel": "Cancel",
    "confirm": "Remove"
  },
  "fr": {
    "logo": "Logo",
    "banniere": "Bannière",
    "logoOf": "Logo de {name}",
    "banniereOf": "Bannière de {name}",
    "none": "Aucun",
    "phone": "Téléphone public",
    "removeLogo": "Retirer le logo",
    "removeBanner": "Retirer la bannière",
    "removedLogo": "Logo retiré.",
    "removedBanner": "Bannière retirée.",
    "help": "Le visuel disparaît aussitôt des pages de {name} ; la boutique peut en envoyer un autre. Le motif est conservé dans le journal.",
    "reason": "Motif (5 caractères minimum)",
    "cancel": "Annuler",
    "confirm": "Retirer"
  }
}
</i18n>
