<script setup lang="ts">
import type { ApiAppelant } from "@/types/api/auth"
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"
import { brand } from "../brand.config"

const route = useRoute()
const apiFetch = useApiFetch()

useQuery<ApiAppelant | null>({
  queryKey: ["v1", "moi"],
  queryFn: async () => {
    const identity = await apiFetch<ApiAppelant>("/moi")
    return identity.type === "equipe" ? identity : null
  },
  enabled: computed(() => import.meta.client && !route.meta.public),
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: true,
})

const showsStandaloneLanguageSwitcher = computed(() => {
  const routeName = String(route.name ?? "")
  return route.meta.layout !== "admin" && !routeName.startsWith("login")
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator :color="brand.colors.orange" :height="3" />
    <div v-if="showsStandaloneLanguageSwitcher" class="fixed right-4 top-4 z-10">
      <LanguageSwitcher />
    </div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
