<script setup lang="ts">
import type { PointVenteAdmin } from "@/types/api/vitrine"
import { PhDotsThree } from "@phosphor-icons/vue"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const { point } = defineProps<{
  point: PointVenteAdmin
}>()

const emit = defineEmits<{
  edit: []
  toggle: []
  copyKey: []
  copyDetails: []
  remove: []
}>()

const { t } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon-sm"
        data-testid="points-of-sale-row-menu"
        :aria-label="t('pointsOfSale.menu.label', { name: point.libelle })"
      >
        <PhDotsThree :size="18" weight="bold" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-60">
      <DropdownMenuItem data-testid="points-of-sale-menu-edit" @select="emit('edit')">
        <Icon name="ph:pencil-simple" size="16" aria-hidden="true" />
        {{ t("pointsOfSale.menu.edit") }}
      </DropdownMenuItem>
      <DropdownMenuItem data-testid="points-of-sale-menu-toggle" @select="emit('toggle')">
        <Icon :name="point.active ? 'ph:eye-slash' : 'ph:eye'" size="16" aria-hidden="true" />
        {{ t(point.active ? "pointsOfSale.menu.hide" : "pointsOfSale.menu.show") }}
      </DropdownMenuItem>
      <DropdownMenuItem data-testid="points-of-sale-menu-copy-key" @select="emit('copyKey')">
        <Icon name="ph:key" size="16" aria-hidden="true" />
        {{ t("pointsOfSale.menu.copyKey") }}
        <span class="ml-auto font-mono text-xs text-muted-foreground">{{ point.cle }}</span>
      </DropdownMenuItem>
      <DropdownMenuItem data-testid="points-of-sale-menu-copy-details" @select="emit('copyDetails')">
        <Icon name="ph:copy" size="16" aria-hidden="true" />
        {{ t("pointsOfSale.menu.copyDetails") }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem data-testid="points-of-sale-menu-delete" variant="destructive" @select="emit('remove')">
        <Icon name="ph:trash" size="16" aria-hidden="true" />
        {{ t("pointsOfSale.menu.delete") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
