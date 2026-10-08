<script setup lang="ts">
import { TooltipContent } from "@/components/ui/tooltip"
</script>

<template>
  <!-- shadcn's tooltip est inversé (fond = foreground) : blanc sur le panneau sombre.
       Même surface que les autres calques (menu, select, popover), flèche comprise. -->
  <TooltipContent
    class="bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/5 dark:ring-foreground/10 [&_svg]:bg-popover [&_svg]:fill-popover"
  >
    <slot />
  </TooltipContent>
</template>
