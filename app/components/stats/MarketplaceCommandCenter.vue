<script setup lang="ts">
import type { MarketplaceCommandCenter } from "@/types/api/statistiques"
import DirectionAlerts from "@/components/stats/DirectionAlerts/DirectionAlerts.vue"
import DirectionHealth from "@/components/stats/DirectionHealth/DirectionHealth.vue"
import DirectionOperationalFlow from "@/components/stats/DirectionOperationalFlow/DirectionOperationalFlow.vue"
import DirectionPriorityQueues from "@/components/stats/DirectionPriorityQueues/DirectionPriorityQueues.vue"
import DirectionQuickActions from "@/components/stats/DirectionQuickActions/DirectionQuickActions.vue"
import { buildDirectionQueues } from "@/utils/direction-cockpit"

const { marketplace } = defineProps<{ marketplace: MarketplaceCommandCenter }>()
const queues = computed(() => buildDirectionQueues(marketplace))
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="marketplace-command-center">
    <StatsMarketplaceKpiGrid :marketplace="marketplace" />
    <div class="grid gap-4 xl:grid-cols-12">
      <DirectionPriorityQueues :queues="queues" class="xl:col-span-8" />
      <DirectionHealth :marketplace="marketplace" class="xl:col-span-4" />
    </div>
    <div class="grid gap-4 xl:grid-cols-12">
      <DirectionOperationalFlow :marketplace="marketplace" class="xl:col-span-8" />
      <DirectionAlerts :alerts="marketplace.alerts" class="xl:col-span-4" />
    </div>
    <DirectionQuickActions :queues="queues" />
  </div>
</template>
