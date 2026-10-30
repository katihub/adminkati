<script setup lang="ts">
import type { AdminNavigationItem, AdminNavigationLink } from "@/utils/admin-navigation"
import { isAdminNavigationItemActive } from "@/utils/admin-navigation"

const {
  item,
  pendingId,
  mobile = false,
} = defineProps<{
  item: AdminNavigationItem
  pendingId: string | null
  mobile?: boolean
}>()
const emit = defineEmits<{ select: [item: AdminNavigationLink, event: MouseEvent] }>()
const route = useRoute()
const { t } = useI18n()
const isActive = (link: AdminNavigationLink) => isAdminNavigationItemActive(link, route)
</script>

<template>
  <div class="flex flex-col gap-1">
    <NuxtLinkLocale
      :to="item.to"
      :prefetch-on="{ interaction: true }"
      :aria-current="isActive(item) ? 'page' : undefined"
      :aria-busy="pendingId === item.id || undefined"
      class="group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
      :data-active="isActive(item)"
      :data-testid="`${mobile ? 'admin-mobile-navigation-link' : 'admin-navigation-link'}-${item.id}`"
      @click="emit('select', item, $event)"
    >
      <Icon :name="item.icon" size="20" aria-hidden="true" class="shrink-0" />
      <span class="min-w-0 flex-1 truncate">{{ t(item.labelKey) }}</span>
      <Spinner v-if="pendingId === item.id" size="xs" class="shrink-0" />
    </NuxtLinkLocale>

    <div v-if="item.children?.length" class="ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
      <NuxtLinkLocale
        v-for="child in item.children"
        :key="child.id"
        :to="child.to"
        :prefetch-on="{ interaction: true }"
        :aria-current="isActive(child) ? 'page' : undefined"
        :aria-busy="pendingId === child.id || undefined"
        class="flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
        :data-active="isActive(child)"
        :data-testid="`${mobile ? 'admin-mobile-navigation-child' : 'admin-navigation-child'}-${child.id}`"
        @click="emit('select', child, $event)"
      >
        <Icon :name="child.icon" size="18" aria-hidden="true" class="shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ t(child.labelKey) }}</span>
        <Spinner v-if="pendingId === child.id" size="xs" class="shrink-0" />
      </NuxtLinkLocale>
    </div>
  </div>
</template>
