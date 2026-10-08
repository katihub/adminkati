<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner"

// Toasts keep to the bottom-right corner, so they start above the AI launcher instead of covering it.
const TOAST_OFFSET = { bottom: "5rem" }
</script>

<template>
  <div data-testid="admin-shell" class="bg-background text-foreground">
    <AdminHeader />
    <main class="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 bg-muted/65">
      <slot />
    </main>
    <Toaster :offset="TOAST_OFFSET" :mobile-offset="TOAST_OFFSET" />
    <AdminAiGenerationLauncher />
  </div>
</template>
