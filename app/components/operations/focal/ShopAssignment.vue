<script setup lang="ts">
import type { FocalPointMember, FocalPointShop } from "@/types/api/points-focaux"
import { computed } from "vue"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useAssignFocalPoint } from "@/composables/useFocalPoints"
import { apiErrorText } from "@/utils/api-error"

/* One shop and its focal point. Choosing another one moves the shop at once:
   a shop has at most one focal point, and the backend logs the before and after. */
const props = defineProps<{ shop: FocalPointShop; members: FocalPointMember[] }>()

const { t } = useI18n()
const assign = useAssignFocalPoint()
// Only an active focal point can receive a shop; the current one stays listed even if it no longer is.
const options = computed(() => props.members.filter(member => member.actif || member.id === props.shop.pointFocal?.id))
const inactive = computed(() => Boolean(props.shop.pointFocal && !props.shop.pointFocal.actif))
const selected = computed({
  get: () => props.shop.pointFocal?.id ?? "",
  set: value => void change(value),
})

async function change(value: unknown) {
  const membreId = typeof value === "string" && value ? value : null
  if (membreId === (props.shop.pointFocal?.id ?? null)) return
  try {
    await assign.mutateAsync({ shopId: props.shop.id, membreId })
    toast.success(
      t(membreId ? "operations.focal.assign.assigned" : "operations.focal.assign.removed", { shop: props.shop.nom }),
    )
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>

<template>
  <li
    class="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_240px] md:items-center"
    :data-testid="`focal-assign-${shop.id}`"
  >
    <span class="min-w-0">
      <span class="block truncate font-medium">{{ shop.nom }}</span>
      <span class="block truncate text-xs text-muted-foreground">{{
        [shop.ville, shop.vendeur.nomLegal, t(`operations.trust.shopStatus.${shop.statut}`)].filter(Boolean).join(" · ")
      }}</span>
      <Badge v-if="inactive" variant="outline" class="mt-1 text-destructive">{{
        t("operations.focal.assign.inactive")
      }}</Badge>
    </span>
    <NativeSelect
      v-model="selected"
      :disabled="assign.isPending.value"
      :aria-label="t('operations.focal.assign.label', { shop: shop.nom })"
      :data-testid="`focal-assign-select-${shop.id}`"
    >
      <NativeSelectOption value="">{{ t("operations.focal.assign.none") }}</NativeSelectOption>
      <NativeSelectOption v-for="member in options" :key="member.id" :value="member.id">{{
        member.nom
      }}</NativeSelectOption>
    </NativeSelect>
  </li>
</template>
