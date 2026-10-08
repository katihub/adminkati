<script setup lang="ts">
import type { TeamMember, UpdateTeamMemberInput } from "@/types/api/equipe"
import { computed, ref, watch } from "vue"
import { useComptoirs } from "@/composables/usePointsVente"
import { comptoirLabels } from "@/utils/comptoirs"

const { member, selected, isPending, error, canManage, isSelf, saving, lifecyclePending } = defineProps<{
  member: TeamMember | undefined
  selected: boolean
  isPending: boolean
  error: unknown
  canManage: boolean
  isSelf: boolean
  saving: boolean
  lifecyclePending: boolean
}>()

const emit = defineEmits<{
  retry: []
  back: []
  save: [input: UpdateTeamMemberInput]
  dirty: [value: boolean]
  cancel: []
  deactivate: []
  reactivate: []
}>()

const { t } = useI18n()
const { comptoirs } = useComptoirs()
const profileName = ref("")
const memberMetadata = computed(() => {
  if (!member) return []

  const cles = member.comptoirs ?? []
  const perimetre =
    cles.length === 0 ? t("team.comptoirs.wholeShop") : comptoirLabels(comptoirs.value, cles).join(" · ")

  return [perimetre, member.roles.map(role => t(`team.roles.${role}`)).join(" · ")].filter((value): value is string =>
    Boolean(value),
  )
})

watch(
  () => member,
  value => {
    profileName.value = value?.nom ?? ""
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-full" data-testid="team-detail-panel">
    <div v-if="error" class="flex h-full min-h-[20rem] items-center justify-center p-6 text-center">
      <ApiErrorCard :error="error" @retry="emit('retry')" />
    </div>
    <div
      v-else-if="!selected"
      data-testid="team-detail-empty"
      class="flex h-full min-h-[20rem] items-center justify-center p-6"
    >
      <EmptyStateCard icon="ph:cursor-click" :text="t('team.page.empty')" />
    </div>
    <div v-else-if="isPending" class="flex h-full min-h-[20rem] items-center justify-center p-6 text-center">
      <p data-testid="team-detail-loading" class="text-sm text-muted-foreground">
        {{ t("team.page.loading") }}
      </p>
    </div>
    <article v-else-if="member" data-testid="team-detail-content">
      <TeamDetailHeader :member="member" @back="emit('back')">
        <template #actions>
          <TeamManagementActions
            v-if="canManage"
            :member="member"
            :is-self="isSelf"
            :pending="lifecyclePending"
            @deactivate="emit('deactivate')"
            @reactivate="emit('reactivate')"
          />
        </template>
      </TeamDetailHeader>
      <div class="space-y-4 p-4 sm:p-6">
        <PeopleProfileCard
          v-model:title="profileName"
          :eyebrow="t('team.detail.profileOverview')"
          :metadata="memberMetadata"
          :editable="canManage"
          :disabled="saving"
          :title-label="t('team.form.name')"
        >
          <TeamMemberDetails
            v-if="canManage"
            v-model:name="profileName"
            :member="member"
            :allow-role-edit="canManage && !isSelf"
            :pending="saving"
            @save="emit('save', $event)"
            @cancel="emit('cancel')"
            @dirty="emit('dirty', $event)"
          />
          <TeamContactDetails v-else :member="member" />
          <TeamLifecycleDetails :member="member" />
        </PeopleProfileCard>
      </div>
    </article>
  </div>
</template>
