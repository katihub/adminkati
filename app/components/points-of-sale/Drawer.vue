<script setup lang="ts">
import type { PointVenteAdmin } from "@/types/api/vitrine"
import type { PointVenteSection } from "@/utils/point-of-sale"
import { useTemplateRef } from "vue"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const { open, point, mode, section, nextPosition } = defineProps<{
  open: boolean
  /** The counter being edited or viewed; `null` in creation. */
  point: PointVenteAdmin | null
  mode: "create" | "edit" | "view" | "notFound"
  section: PointVenteSection | null
  nextPosition: number
}>()

const emit = defineEmits<{
  close: []
  created: [id: number]
  saved: []
}>()

const { t } = useI18n()

const editor = useTemplateRef<{ requestClose: () => void }>("editor")

/** Escape and the overlay go through the editor, which asks before dropping unsaved changes. */
function onOpenChange(isOpen: boolean) {
  if (isOpen) return
  if (editor.value) editor.value.requestClose()
  else emit("close")
}
</script>

<template>
  <Sheet :open="open" @update:open="onOpenChange">
    <SheetContent
      side="right"
      data-testid="points-of-sale-drawer"
      :show-close-button="mode === 'view' || mode === 'notFound'"
      class="@container gap-0 p-0 data-[side=right]:w-full sm:data-[side=right]:max-w-[1100px]"
    >
      <PointsOfSaleDrawerEditor
        v-if="mode === 'create' || mode === 'edit'"
        ref="editor"
        :point="mode === 'edit' ? point : null"
        :section="section"
        :next-position="nextPosition"
        @close="emit('close')"
        @created="id => emit('created', id)"
        @saved="emit('saved')"
      />

      <template v-else>
        <SheetHeader class="border-b border-border">
          <SheetTitle data-testid="points-of-sale-drawer-title">
            {{ point?.libelle ?? t("pointsOfSale.panel.title") }}
          </SheetTitle>
          <SheetDescription class="sr-only">
            {{ t("pointsOfSale.panel.description") }}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea v-if="point" class="min-h-0 flex-1">
          <div data-testid="points-of-sale-panel-view" class="p-6">
            <PointsOfSaleDetails :point="point" />
          </div>
        </ScrollArea>

        <div
          v-else
          data-testid="points-of-sale-drawer-not-found"
          class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <p class="text-sm text-muted-foreground">
            {{ t("pointsOfSale.panel.notFound") }}
          </p>
          <Button variant="outline" size="sm" @click="emit('close')">
            {{ t("pointsOfSale.panel.close") }}
          </Button>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
