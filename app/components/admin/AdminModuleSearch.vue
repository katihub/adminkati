<script setup lang="ts">
import { computed, ref } from "vue"
import { Input } from "@/components/ui/input"
import { visibleAdminNavigationItems } from "@/utils/admin-navigation"
import { includesIgnoringAccents } from "@/utils/search-text"

const { t } = useI18n()
const session = useCachedSession()
const query = ref("")

const destinations = computed(() =>
  visibleAdminNavigationItems(session.value).flatMap(item => [
    { ...item, label: t(item.labelKey) },
    ...(item.children ?? []).map(child => ({ ...child, label: t(child.labelKey) })),
  ]),
)

const results = computed(() => {
  const value = query.value.trim()
  if (!value) return []
  return destinations.value.filter(item => includesIgnoringAccents(item.label, value)).slice(0, 8)
})

function clear() {
  query.value = ""
}
</script>

<template>
  <div class="relative hidden w-full max-w-2xl lg:block">
    <Icon
      name="ph:magnifying-glass"
      size="20"
      aria-hidden="true"
      class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
    />
    <Input
      v-model="query"
      type="search"
      class="h-10 bg-background pl-10 text-sm"
      :aria-label="t('admin.moduleSearch.label')"
      :placeholder="t('admin.moduleSearch.placeholder')"
      autocomplete="off"
      data-testid="admin-module-search-input"
    />

    <div
      v-if="query.trim()"
      data-testid="admin-module-search-results"
      class="absolute top-full right-0 left-0 mt-2 overflow-hidden rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
    >
      <NuxtLinkLocale
        v-for="result in results"
        :key="result.id"
        :to="result.to"
        class="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="clear"
      >
        <Icon :name="result.icon" size="19" aria-hidden="true" class="shrink-0 text-muted-foreground" />
        <span class="truncate">{{ result.label }}</span>
      </NuxtLinkLocale>
      <p v-if="results.length === 0" class="px-3 py-4 text-center text-sm text-muted-foreground">
        {{ t("admin.moduleSearch.empty") }}
      </p>
    </div>
  </div>
</template>
