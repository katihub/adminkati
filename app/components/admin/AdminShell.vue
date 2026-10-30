<script setup lang="ts">
import { ScrollArea } from "@/components/ui/scroll-area"
import { Toaster } from "@/components/ui/sonner"

const TOAST_OFFSET = { bottom: "5rem" }
</script>

<template>
  <div data-testid="admin-shell" class="min-h-dvh bg-muted/65 text-foreground lg:grid lg:admin-shell-columns">
    <aside
      data-testid="admin-desktop-sidebar"
      class="dark sticky top-0 hidden h-dvh min-h-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
    >
      <NuxtLinkLocale
        to="/"
        :aria-label="$t('admin.brandLabel')"
        class="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sidebar-ring"
        data-testid="admin-sidebar-brand"
      >
        <BrandWordmark size="sm" />
      </NuxtLinkLocale>
      <ScrollArea class="min-h-0 flex-1">
        <div class="p-3">
          <AdminNavigation />
        </div>
      </ScrollArea>
    </aside>

    <div class="min-w-0">
      <AdminHeader />
      <main class="mx-auto w-full max-w-admin px-4 sm:px-6 lg:px-10">
        <slot />
      </main>
    </div>

    <Toaster :offset="TOAST_OFFSET" :mobile-offset="TOAST_OFFSET" />
    <AdminAiGenerationLauncher />
  </div>
</template>
