<script setup lang="ts">
import { ref } from "vue"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-11 lg:hidden"
        :aria-label="t('admin.navigation.open')"
        data-testid="admin-mobile-navigation-trigger"
      >
        <Icon name="ph:list" size="26" aria-hidden="true" />
      </Button>
    </SheetTrigger>
    <SheetContent
      side="left"
      :show-close-button="false"
      class="dark w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-72"
      data-testid="admin-mobile-navigation"
    >
      <div class="flex h-16 items-center justify-between gap-3 border-b border-sidebar-border px-4">
        <SheetTitle class="text-sidebar-foreground">
          <BrandWordmark size="sm" />
        </SheetTitle>
        <SheetDescription class="sr-only">
          {{ t("admin.navigation.description") }}
        </SheetDescription>
        <SheetClose as-child>
          <Button
            variant="ghost"
            size="icon"
            class="size-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            :aria-label="t('admin.navigation.close')"
          >
            <Icon name="ph:x" size="24" aria-hidden="true" />
          </Button>
        </SheetClose>
      </div>
      <ScrollArea class="min-h-0 flex-1">
        <div class="p-3">
          <AdminNavigation mobile @navigate="open = false" />
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
</template>
