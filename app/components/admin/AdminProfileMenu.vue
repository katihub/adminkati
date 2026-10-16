<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query"
import { SwitchRoot, SwitchThumb } from "reka-ui"
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCachedSession } from "@/composables/useCachedSession"
import { getInitials } from "@/utils/initials"

const { locale, t } = useI18n()
const queryClient = useQueryClient()
const router = useRouter()
const colorMode = useColorMode()
const loggingOut = ref(false)
const logoutSession = useAuthLogout(queryClient)
const session = useCachedSession(queryClient)

const displayName = computed(() => session.value?.nom || t("admin.profile.name"))
const displayEmail = computed(() => session.value?.courriel || t("admin.profile.identity"))
const initials = computed(() => getInitials(session.value?.nom) || t("admin.profile.initials"))
const isDirection = computed(() => session.value?.roles.includes("direction") ?? false)

const isDark = computed({
  get: () => colorMode.preference === "dark" || (colorMode.preference === "system" && colorMode.value === "dark"),
  set: value => {
    colorMode.preference = value ? "dark" : "light"
  },
})

async function logout() {
  if (loggingOut.value) return

  loggingOut.value = true
  try {
    await logoutSession()
    await router.push(locale.value === "en" ? "/login" : `/${locale.value}/connexion`)
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-11 min-h-11 min-w-11"
        :aria-label="t('admin.profile.label')"
        data-testid="admin-profile-trigger"
      >
        <span
          aria-hidden="true"
          class="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
          >{{ initials }}</span
        >
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" data-testid="admin-profile-content" class="w-64">
      <DropdownMenuLabel class="px-3 py-2">
        <span data-testid="admin-profile-name" class="block truncate text-sm font-semibold text-foreground">{{
          displayName
        }}</span>
        <span data-testid="admin-profile-email" class="block truncate text-xs font-normal text-muted-foreground">{{
          displayEmail
        }}</span>
        <span v-if="isDirection" class="mt-1 block text-xs font-semibold text-brand-orange">{{
          t("admin.profile.direction")
        }}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div class="flex items-center justify-between gap-3 px-3 py-2" data-testid="admin-profile-preferences">
        <LanguageSwitcher variant="ghost" />
        <div
          class="flex shrink-0 items-center gap-2"
          role="group"
          :aria-label="t('admin.profile.theme')"
          data-testid="admin-theme-control"
        >
          <Icon name="ph:sun" class="size-4 text-muted-foreground" aria-hidden="true" />
          <SwitchRoot
            v-model="isDark"
            class="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-muted p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:bg-primary"
            :aria-label="t('admin.profile.theme')"
            :title="isDark ? t('admin.profile.dark') : t('admin.profile.light')"
            data-testid="admin-theme-toggle"
          >
            <SwitchThumb
              class="pointer-events-none block size-5 translate-x-0 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-5"
            />
          </SwitchRoot>
          <Icon name="ph:moon" class="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        :disabled="loggingOut"
        data-testid="admin-profile-logout"
        @select="logout"
      >
        <Icon name="ph:sign-out" class="size-4" aria-hidden="true" />
        <span>{{ loggingOut ? t("admin.profile.loggingOut") : t("admin.profile.logout") }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
