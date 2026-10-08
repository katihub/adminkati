<script setup lang="ts">
import type { TeamMember, TeamRole, UpdateTeamMemberInput } from "@/types/api/equipe"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useComptoirs } from "@/composables/usePointsVente"
import { isTeamPhoneValid, TEAM_PHONE_PLACEHOLDER } from "@/composables/useTeamPhone"
import { buildTeamMemberUpdate } from "@/utils/team-member-update"

const props = defineProps<{
  member: TeamMember
  allowRoleEdit: boolean
  pending: boolean
}>()

const emit = defineEmits<{
  save: [input: UpdateTeamMemberInput]
  cancel: []
  dirty: [value: boolean]
}>()

const name = defineModel<string>("name", { required: true })
const { t } = useI18n()
const telephone = ref("")
const selectedComptoirs = ref<string[]>([])
const roles = ref<TeamRole[]>([])
const { comptoirs } = useComptoirs()
const errorMessage = ref<string | null>(null)
const teamRoles: TeamRole[] = ["direction", "comptoir", "preparation", "livreur"]
const roleOptions = computed(() =>
  teamRoles.map(role => ({
    id: role,
    label: t(`team.roles.${role}`),
  })),
)
const roleTestIds = {
  root: "team-member-roles",
  item: "team-member-role",
  remove: "team-member-role-remove",
  overflow: "team-member-role-overflow",
  add: "team-member-role-add",
}

function loadMember(member: TeamMember) {
  name.value = member.nom
  telephone.value = member.telephone ?? ""
  selectedComptoirs.value = [...(member.comptoirs ?? [])]
  roles.value = [...member.roles]
  errorMessage.value = null
}

watch(() => props.member, loadMember, { immediate: true })

/** Cocher puis décocher revient au même périmètre : c'est l'ensemble qui compte, pas l'ordre des clics. */
function sameSet(left: readonly string[], right: readonly string[]) {
  return [...left].sort().join("|") === [...right].sort().join("|")
}

const dirty = computed(
  () =>
    name.value !== props.member.nom ||
    telephone.value !== (props.member.telephone ?? "") ||
    !sameSet(selectedComptoirs.value, props.member.comptoirs ?? []) ||
    (props.allowRoleEdit && roles.value.join("|") !== props.member.roles.join("|")),
)

watch(dirty, value => emit("dirty", value), { immediate: true })

function updateRoles(value: string[]) {
  roles.value = value.filter((role): role is TeamRole => teamRoles.includes(role as TeamRole))
}

function removeItemLabel(name: string) {
  return t("team.form.removeRole", { name })
}

function moreItemsLabel(count: number) {
  return t("team.form.moreRoles", { count })
}

function applySavedInput(input: UpdateTeamMemberInput) {
  name.value = input.nom ?? name.value
  telephone.value = input.telephone ?? ""
  selectedComptoirs.value = [...(input.comptoirs ?? [])]
}

function save() {
  if (props.pending) return

  // Le backend n'accepte qu'une forme (`+237 6XX XX XX XX`) ; la refuser ici
  // évite un aller-retour dont le motif serait arrivé après coup.
  if (!isTeamPhoneValid(telephone.value)) {
    errorMessage.value = t("team.form.phoneInvalid")
    return
  }

  const input = buildTeamMemberUpdate({
    name: name.value,
    telephone: telephone.value,
    comptoirs: selectedComptoirs.value,
    roles: roles.value,
    allowRoleEdit: props.allowRoleEdit,
  })

  if (!input) {
    errorMessage.value = t("team.form.nameRequired")
    return
  }

  applySavedInput(input)
  errorMessage.value = null
  emit("save", input)
}

function cancel() {
  loadMember(props.member)
  emit("cancel")
}
</script>

<template>
  <section class="p-4 sm:p-6" data-testid="team-member-details">
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-2">
        <Icon name="ph:address-book" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="font-heading text-lg font-semibold text-foreground">
          {{ t("team.form.title") }}
        </h3>
      </div>
      <span v-if="pending" class="text-xs text-muted-foreground">{{ t("team.form.saving") }}</span>
    </div>

    <div class="mt-4 grid gap-x-6 gap-y-4 border-t border-border/70 pt-4 sm:grid-cols-2">
      <div class="min-w-0 space-y-1.5">
        <span class="text-xs font-medium text-muted-foreground">{{ t("team.form.email") }}</span>
        <p
          class="flex h-9 items-center border-b border-dashed border-foreground/60 px-0 text-sm text-muted-foreground"
          data-testid="team-member-email"
        >
          {{ member.courriel }}
        </p>
      </div>
      <div class="min-w-0 space-y-1.5">
        <label for="team-member-phone" class="text-xs font-medium text-muted-foreground">{{
          t("team.form.phone")
        }}</label>
        <Input
          id="team-member-phone"
          data-testid="team-member-phone-input"
          type="tel"
          inputmode="tel"
          :placeholder="TEAM_PHONE_PLACEHOLDER"
          aria-describedby="team-member-phone-hint"
          :model-value="telephone"
          :disabled="pending"
          class="h-9 w-full rounded-none border-0 border-b border-dashed border-foreground/60 bg-transparent px-0 py-0 text-sm font-medium text-foreground shadow-none focus:border-solid focus:border-primary focus-visible:border-solid focus-visible:border-primary focus-visible:ring-0"
          @update:model-value="telephone = String($event)"
        />
        <p id="team-member-phone-hint" class="text-xs text-muted-foreground" data-testid="team-member-phone-hint">
          {{ t("team.form.phoneHint") }}
        </p>
      </div>
    </div>

    <TeamComptoirsField
      v-model="selectedComptoirs"
      class="mt-4 border-t border-border/70 pt-4"
      :comptoirs="comptoirs"
      :disabled="pending"
      test-id-prefix="team-member"
    />

    <InlineTagSelector
      v-if="allowRoleEdit"
      class="mt-4 border-t border-border/70 pt-4"
      :options="roleOptions"
      :selected-ids="roles"
      :disabled="pending"
      :label="t('team.form.roles')"
      :search-placeholder="t('team.form.roleSearchPlaceholder')"
      :no-results-label="t('team.form.noRoleResults')"
      :add-label="t('team.form.addRole')"
      :add-selected-label="t('team.form.addRoles')"
      :remove-item-label="removeItemLabel"
      :more-items-label="moreItemsLabel"
      :test-ids="roleTestIds"
      @update:selected-ids="updateRoles"
    />
    <p v-else class="mt-4 text-xs text-muted-foreground">
      {{ t("team.form.selfRoleNotice") }}
    </p>

    <p v-if="errorMessage" class="mt-3 text-sm text-destructive" role="alert" data-testid="team-member-details-error">
      {{ errorMessage }}
    </p>
    <div v-if="dirty" class="mt-4 flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" :disabled="pending" data-testid="team-member-cancel" @click="cancel">
        {{ t("team.form.cancel") }}
      </Button>
      <Button type="button" :disabled="pending" data-testid="team-member-save" @click="save">
        {{ pending ? t("team.form.saving") : t("team.form.save") }}
      </Button>
    </div>
  </section>
</template>
