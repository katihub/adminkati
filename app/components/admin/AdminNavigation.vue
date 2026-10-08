<script setup lang="ts">
import type { AdminNavigationItem } from "@/utils/admin-navigation"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { isAdminNavigationItemActive, visibleAdminNavigationItems } from "@/utils/admin-navigation"

const route = useRoute()
const { t } = useI18n()
const session = useCachedSession()

const items = computed(() => visibleAdminNavigationItems(session.value))
const isActive = (item: AdminNavigationItem) => isAdminNavigationItemActive(item, route)
</script>

<template>
  <nav :aria-label="t('admin.navigation.label')" class="hidden items-center gap-1 md:flex">
    <NuxtLinkLocale
      v-for="item in items"
      :key="item.id"
      :to="item.to"
      :aria-current="isActive(item) ? 'page' : undefined"
      class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      :class="
        isActive(item)
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      "
      :data-testid="`admin-navigation-link-${item.id}`"
    >
      <Icon
        :name="item.icon"
        size="22"
        aria-hidden="true"
        class="shrink-0"
        :data-testid="`admin-navigation-icon-${item.id}`"
      />
      {{ t(item.labelKey) }}
    </NuxtLinkLocale>
  </nav>

  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="icon"
        class="size-11 min-h-11 min-w-11 md:hidden"
        :aria-label="t('admin.navigation.open')"
        data-testid="admin-mobile-navigation-trigger"
      >
        <Icon name="ph:list" size="26" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="md:hidden">
      <DropdownMenuItem v-for="item in items" :key="item.id" as-child>
        <NuxtLinkLocale
          :to="item.to"
          class="flex items-center gap-2"
          :data-testid="`admin-mobile-navigation-link-${item.id}`"
        >
          <Icon
            :name="item.icon"
            size="22"
            aria-hidden="true"
            class="shrink-0"
            :data-testid="`admin-mobile-navigation-icon-${item.id}`"
          />
          {{ t(item.labelKey) }}
        </NuxtLinkLocale>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
