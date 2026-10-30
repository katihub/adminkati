<script setup lang="ts">
import type { AdminNavigationLink } from "@/utils/admin-navigation"
import { computed, ref } from "vue"
import { isAdminNavigationItemActive, visibleAdminNavigationItems } from "@/utils/admin-navigation"

const emit = defineEmits<{ navigate: [] }>()
const { mobile = false } = defineProps<{ mobile?: boolean }>()

const route = useRoute()
const router = useRouter()
const nuxtApp = useNuxtApp()
const { t } = useI18n()
const session = useCachedSession()
const pendingId = ref<string | null>(null)

const items = computed(() => visibleAdminNavigationItems(session.value))

function startNavigation(item: AdminNavigationLink, event: MouseEvent) {
  if (
    [event.defaultPrevented, event.button !== 0, event.metaKey, event.ctrlKey, event.shiftKey, event.altKey].some(
      Boolean,
    )
  )
    return

  if (!isAdminNavigationItemActive(item, route)) pendingId.value = item.id
  emit("navigate")
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
  <nav :aria-label="t('admin.navigation.label')" class="flex min-h-0 flex-1 flex-col gap-1">
    <AdminNavigationGroup
      v-for="item in items"
      :key="item.id"
      :item="item"
      :pending-id="pendingId"
      :mobile="mobile"
      @select="startNavigation"
    />
  </nav>
</template>
