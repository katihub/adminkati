<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type {
  HireTeamMemberResult,
  TeamDirectoryPage,
  TeamMember,
  TeamRole,
  TeamSort,
  UpdateTeamMemberInput,
} from "@/types/api/equipe"
import type { RouteLocationRaw } from "vue-router"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { onBeforeRouteLeave, useRouter } from "vue-router"
import { toast } from "vue-sonner"
import { prefetchApi } from "@/composables/useApi"
import { useCachedSession } from "@/composables/useCachedSession"
import { prefetchTeam, useTeam, useTeamMember } from "@/composables/useTeam"
import { useTeamMutations } from "@/composables/useTeamMutations"
import { apiErrorText } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { routeQueryString, routeQueryUuid } from "@/utils/route-query"

definePageMeta({ layout: "admin", team: true })

defineI18nRoute({
  paths: {
    en: "/team",
    fr: "/equipe",
  },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const queryClient = useNuxtApp().$queryClient
const session = useCachedSession()

function teamRole(value: unknown): TeamRole | undefined {
  const role = routeQueryString(value)
  return role === "direction" || role === "comptoir" || role === "preparation" || role === "livreur" ? role : undefined
}

function teamSort(value: unknown): TeamSort {
  return routeQueryString(value) === "recent" ? "recent" : "nom"
}

const selectedId = computed(() => routeQueryUuid(route.query.id))
const autoSelectionDismissed = ref(false)
const role = computed(() => teamRole(route.query.role))
const active = computed(() => {
  const value = routeQueryString(route.query.actif)
  return value === "true" ? true : value === "false" ? false : undefined
})
const sort = computed(() => teamSort(route.query.tri))
const searchInput = ref(routeQueryString(route.query.q) ?? "")
const isDirty = ref(false)
const discardDialogOpen = ref(false)
let pendingDiscardAction: (() => void) | null = null
let pendingRoute: RouteLocationRaw | null = null

watch(
  () => route.query.q,
  value => {
    const next = routeQueryString(value) ?? ""
    if (next !== searchInput.value) searchInput.value = next
  },
)

const listFilters = computed(() => {
  const q = searchInput.value.trim()
  return {
    ...(q ? { q } : {}),
    ...(role.value ? { role: role.value } : {}),
    ...(active.value === undefined ? {} : { actif: active.value }),
    tri: sort.value,
    taille: 50,
  }
})

function workspaceQuery(overrides: { id?: string; q?: string; role?: TeamRole; actif?: boolean; tri?: TeamSort } = {}) {
  const q = "q" in overrides ? overrides.q : searchInput.value.trim() || undefined
  const id = "id" in overrides ? overrides.id : (selectedId.value ?? undefined)
  const selectedRole = "role" in overrides ? overrides.role : role.value
  const selectedActive = "actif" in overrides ? overrides.actif : active.value
  const tri = "tri" in overrides ? overrides.tri : sort.value

  return {
    ...(id ? { id } : {}),
    ...(q ? { q } : {}),
    ...(selectedRole ? { role: selectedRole } : {}),
    ...(selectedActive === undefined ? {} : { actif: String(selectedActive) }),
    ...(tri !== "nom" ? { tri } : {}),
  }
}

function runAfterDiscard(action: () => void) {
  if (!isDirty.value) {
    action()
    return
  }
  pendingDiscardAction = action
  discardDialogOpen.value = true
}

function confirmDiscard() {
  isDirty.value = false
  discardDialogOpen.value = false
  const action = pendingDiscardAction
  const destination = pendingRoute
  pendingDiscardAction = null
  pendingRoute = null
  action?.()
  if (destination) void router.push(destination)
}

function cancelDiscard() {
  pendingDiscardAction = null
  pendingRoute = null
  discardDialogOpen.value = false
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function updateSearch(value: string) {
  runAfterDiscard(() => {
    searchInput.value = value
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      void navigateTo({ path: route.path, query: workspaceQuery({ q: value.trim() || undefined }) })
    }, 300)
  })
}

function updateRole(value: TeamRole | undefined) {
  runAfterDiscard(() => void navigateTo({ path: route.path, query: workspaceQuery({ role: value }) }))
}

function updateActive(value: boolean | undefined) {
  runAfterDiscard(() => void navigateTo({ path: route.path, query: workspaceQuery({ actif: value }) }))
}

function updateSort(value: TeamSort) {
  runAfterDiscard(() => void navigateTo({ path: route.path, query: workspaceQuery({ tri: value }) }))
}

const toolbarFilters = computed<Filter[]>({
  get: () => [
    { field: "q", operator: "contains", value: searchInput.value || null },
    { field: "role", operator: "eq", value: role.value ?? null },
    { field: "actif", operator: "eq", value: active.value === undefined ? null : String(active.value) },
    { field: "tri", operator: "eq", value: sort.value },
  ],
  set: next => {
    const chip = (field: string) => next.find(candidate => candidate.field === field)?.value
    const searchValue = chip("q")
    const roleValue = chip("role")
    const activeValue = chip("actif")
    const sortValue = chip("tri")
    const nextSearch = typeof searchValue === "string" ? searchValue : ""
    const nextRole =
      roleValue === "direction" || roleValue === "comptoir" || roleValue === "preparation" || roleValue === "livreur"
        ? roleValue
        : undefined
    const nextActive = activeValue === "true" ? true : activeValue === "false" ? false : undefined
    const nextSort = sortValue === "recent" ? "recent" : "nom"

    if (nextSearch !== searchInput.value) updateSearch(nextSearch)
    if (nextRole !== role.value) updateRole(nextRole)
    if (nextActive !== active.value) updateActive(nextActive)
    if (nextSort !== sort.value) updateSort(nextSort)
  },
})

const hasActiveToolbarFilters = computed(
  () => Boolean(searchInput.value) || Boolean(role.value) || active.value !== undefined || sort.value !== "nom",
)

function clearToolbarFilters() {
  if (searchTimer) clearTimeout(searchTimer)
  runAfterDiscard(() => {
    searchInput.value = ""
    void navigateTo({
      path: route.path,
      query: workspaceQuery({ q: undefined, role: undefined, actif: undefined, tri: "nom" }),
    })
  })
}

function selectMember(id: string) {
  runAfterDiscard(() => {
    autoSelectionDismissed.value = false
    void navigateTo({ path: route.path, query: workspaceQuery({ id }) })
  })
}

function clearSelection() {
  runAfterDiscard(() => {
    autoSelectionDismissed.value = true
    void navigateTo({ path: route.path, query: workspaceQuery({ id: undefined }) })
  })
}

onBeforeRouteLeave(to => {
  if (!isDirty.value) return true
  pendingRoute = to.fullPath
  discardDialogOpen.value = true
  return false
})
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

if (import.meta.server) {
  await prefetchTeam(queryClient, listFilters.value)
  const listData = queryClient.getQueryData<{ pages: TeamDirectoryPage[] }>(apiQueryKeys.team.list(listFilters.value))
  const detailId = selectedId.value ?? listData?.pages[0]?.elements[0]?.id

  if (detailId) {
    await prefetchApi<TeamMember>(
      queryClient,
      apiQueryKeys.team.detail(detailId),
      `/equipe/membres/${encodeURIComponent(detailId)}`,
    ).catch(() => undefined)
  }
}

const teamQuery = useTeam(listFilters)
const members = computed(() => teamQuery.data.value?.pages.flatMap(page => page.elements) ?? [])
const autoSelectedId = computed(() => (autoSelectionDismissed.value ? null : (members.value[0]?.id ?? null)))
const effectiveId = computed(() => selectedId.value ?? autoSelectedId.value)
const memberDetailQuery = useTeamMember(effectiveId)
const canWrite = computed(() => session.value?.roles.includes("direction") ?? false)
const isSelf = computed(() => Boolean(effectiveId.value && effectiveId.value === session.value?.membreId))
const { update, deactivate, reactivate } = useTeamMutations()
const saving = computed(() => update.isPending.value)
const lifecyclePending = computed(() => deactivate.isPending.value || reactivate.isPending.value)

async function refetchTeamState() {
  await Promise.all([teamQuery.refetch(), memberDetailQuery.refetch()])
}

async function saveMember(input: UpdateTeamMemberInput) {
  if (!effectiveId.value) return
  try {
    await update.mutateAsync({ id: effectiveId.value, input })
    await refetchTeamState()
    isDirty.value = false
    toast.success(t("team.toast.updated"))
  } catch (error) {
    toast.error(apiErrorText(error, t))
  }
}

async function deactivateMember() {
  if (!effectiveId.value) return
  try {
    await deactivate.mutateAsync(effectiveId.value)
    await refetchTeamState()
    isDirty.value = false
    toast.success(t("team.toast.deactivated"))
  } catch (error) {
    toast.error(apiErrorText(error, t))
  }
}

async function reactivateMember() {
  if (!effectiveId.value) return
  try {
    await reactivate.mutateAsync(effectiveId.value)
    await refetchTeamState()
    isDirty.value = false
    toast.success(t("team.toast.reactivated"))
  } catch (error) {
    toast.error(apiErrorText(error, t))
  }
}

function cancelEdit() {
  isDirty.value = false
}

function requestDeactivate() {
  runAfterDiscard(() => void deactivateMember())
}

function requestReactivate() {
  runAfterDiscard(() => void reactivateMember())
}

/**
 * L'INVITATION NE S'ANNONCE PAS PARTIE QUAND ELLE NE L'EST PAS. Le backend
 * distingue les deux issues (`equipe.service.ts:110-122`) ; le bandeau les
 * distingue aussi, au lieu d'un « membre inscrit » qui laisserait croire que
 * le salarié a reçu son lien.
 */
function announceHire(member: HireTeamMemberResult) {
  if (member.invitationEnvoyee) toast.success(t("team.toast.hired", { name: member.nom }))
  else toast.warning(t("team.toast.hiredWithoutInvitation", { name: member.nom }))
}

function openHiredMember(id: string) {
  runAfterDiscard(() => {
    autoSelectionDismissed.value = false
    void navigateTo({ path: route.path, query: workspaceQuery({ id }) })
  })
}

useSeoMeta({
  title: () => t("team.page.seo.title"),
  description: () => t("team.page.seo.description"),
  ogTitle: () => t("team.page.seo.title"),
  ogDescription: () => t("team.page.seo.description"),
  ogType: "website",
})

useHead({
  titleTemplate: "%s",
})
</script>

<template>
  <div class="-mx-4 flex h-workspace flex-col overflow-hidden sm:-mx-6 lg:-mx-10">
    <TeamDiscardDialog
      :open="discardDialogOpen"
      @update:open="value => (value ? (discardDialogOpen = true) : cancelDiscard())"
      @confirm="confirmDiscard"
    />
    <div class="px-4 sm:px-6 lg:px-10">
      <AdminPageHeader :title="t('team.page.heading')">
        <template #toolbar>
          <TeamFilterBar
            v-model:filters="toolbarFilters"
            :has-active-filters="hasActiveToolbarFilters"
            @clear="clearToolbarFilters"
          />
        </template>
        <template v-if="canWrite" #actions>
          <TeamHireDialog @hired="announceHire" @open="openHiredMember" />
        </template>
      </AdminPageHeader>
    </div>

    <div class="grid flex-1 min-h-0 w-full grid-cols-1 border-t border-border bg-card lg:grid-cols-[300px_1fr]">
      <div
        class="h-full overflow-hidden border-r border-border bg-card"
        :class="effectiveId ? 'hidden lg:block' : 'block'"
        data-testid="team-workspace-sidebar"
      >
        <TeamListPanel
          :members="members"
          :selected-id="effectiveId"
          :is-pending="teamQuery.isPending.value"
          :error="teamQuery.error.value"
          :has-next-page="Boolean(teamQuery.hasNextPage.value)"
          :is-fetching-next-page="teamQuery.isFetchingNextPage.value"
          @select="selectMember"
          @load-more="() => void teamQuery.fetchNextPage()"
        />
      </div>

      <div
        class="h-full overflow-y-auto bg-muted/70"
        :class="effectiveId ? 'block' : 'hidden lg:block'"
        data-testid="team-workspace-detail"
      >
        <TeamDetailPanel
          :member="memberDetailQuery.data.value"
          :selected="Boolean(effectiveId)"
          :is-pending="memberDetailQuery.isPending.value"
          :error="memberDetailQuery.error.value"
          :can-manage="canWrite"
          :is-self="isSelf"
          :saving="saving"
          :lifecycle-pending="lifecyclePending"
          @retry="() => void memberDetailQuery.refetch()"
          @back="clearSelection"
          @save="saveMember"
          @dirty="isDirty = $event"
          @cancel="cancelEdit"
          @deactivate="requestDeactivate"
          @reactivate="requestReactivate"
        />
      </div>
    </div>
  </div>
</template>
