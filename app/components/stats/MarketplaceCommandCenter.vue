<script setup lang="ts">
import type { MarketplaceCommandCenter } from "@/types/api/statistiques"

defineProps<{ marketplace: MarketplaceCommandCenter }>()
</script>

<template>
  <div class="space-y-4" data-testid="marketplace-command-center">
    <StatsMarketplaceKpiGrid :marketplace="marketplace" />
    <StatsMarketplaceOperations :marketplace="marketplace" />
  </div>
</template>
