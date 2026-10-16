<script setup lang="ts">
import type { AdminNavigationItem } from "@/utils/admin-navigation"
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { isAdminNavigationItemActive, visibleAdminNavigationItems } from "@/utils/admin-navigation"

const route = useRoute()
const router = useRouter()
const nuxtApp = useNuxtApp()
const { t } = useI18n()
const session = useCachedSession()
const pendingId = ref<string | null>(null)

const items = computed(() => visibleAdminNavigationItems(session.value))
const isActive = (item: AdminNavigationItem) => isAdminNavigationItemActive(item, route)

function startNavigation(item: AdminNavigationItem, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return
  if (!isActive(item)) pendingId.value = item.id
}

router.afterEach((_to, _from, failure) => {
  if (failure) pendingId.value = null
})
nuxtApp.hook("page:finish", () => {
  pendingId.value = null
})
nuxtApp.hook("vue:error", () => {
  pendingId.value = null
})
</script>

<template>
  <nav :aria-label="t('admin.navigation.label')" class="hidden items-center gap-0.5 xl:flex">
    <NuxtLinkLocale
      v-for="item in items"
      :key="item.id"
      :to="item.to"
      :prefetch-on="{ interaction: true }"
      :aria-current="isActive(item) ? 'page' : undefined"
      :aria-busy="pendingId === item.id || undefined"
      class="flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring 2xl:px-3"
      :class="
        isActive(item)
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      "
      :data-testid="`admin-navigation-link-${item.id}`"
      @click="startNavigation(item, $event)"
    >
      <Icon
        :name="item.icon"
        size="20"
        aria-hidden="true"
        class="shrink-0"
        :data-testid="`admin-navigation-icon-${item.id}`"
      />
      {{ t(item.labelKey) }}
      <Spinner v-if="pendingId === item.id" size="xs" class="shrink-0" />
    </NuxtLinkLocale>
  </nav>

  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="icon"
        class="size-11 min-h-11 min-w-11 xl:hidden"
        :aria-label="t('admin.navigation.open')"
        data-testid="admin-mobile-navigation-trigger"
      >
        <Icon name="ph:list" size="26" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="xl:hidden">
      <DropdownMenuItem v-for="item in items" :key="item.id" as-child>
        <NuxtLinkLocale
          :to="item.to"
          :prefetch-on="{ interaction: true }"
          :aria-current="isActive(item) ? 'page' : undefined"
          :aria-busy="pendingId === item.id || undefined"
          class="flex items-center gap-2"
          :data-testid="`admin-mobile-navigation-link-${item.id}`"
          @click="startNavigation(item, $event)"
        >
          <Icon
            :name="item.icon"
            size="22"
            aria-hidden="true"
            class="shrink-0"
            :data-testid="`admin-mobile-navigation-icon-${item.id}`"
          />
          {{ t(item.labelKey) }}
          <Spinner v-if="pendingId === item.id" size="xs" class="ml-auto shrink-0" />
        </NuxtLinkLocale>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
