import type {
  DeactivateTeamMemberResult,
  HireTeamMemberInput,
  HireTeamMemberResult,
  ReactivateTeamMemberResult,
  TeamMember,
  UpdateTeamMemberInput,
} from "@/types/api/equipe"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useTeamMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()

  const invalidateTeam = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.team.all })
  const update = useMutation<TeamMember, Error, { id: string; input: UpdateTeamMemberInput }>({
    mutationFn: ({ id, input }) =>
      apiWrite<TeamMember>(`/equipe/membres/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
    onSuccess: invalidateTeam,
  })
  const deactivate = useMutation<DeactivateTeamMemberResult, Error, string>({
    mutationFn: id =>
      apiWrite<DeactivateTeamMemberResult>(`/equipe/membres/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: invalidateTeam,
  })
  const reactivate = useMutation<ReactivateTeamMemberResult, Error, string>({
    mutationFn: id =>
      apiWrite<ReactivateTeamMemberResult>(`/equipe/membres/${encodeURIComponent(id)}/reactiver`, { method: "POST" }),
    onSuccess: invalidateTeam,
  })

  /**
   * L'EMBAUCHE, QUI N'AVAIT AUCUN ÉCRAN.
   *
   * Le panel savait modifier, désactiver et réactiver un salarié — pas en
   * inscrire un. Ajouter quelqu'un exigeait un accès direct à la base. Le
   * backend, lui, envoie l'invitation dans la foulée et rend
   * `invitationEnvoyee` pour que l'écran dise la vérité quand elle n'est pas
   * partie.
   */
  const hire = useMutation<HireTeamMemberResult, Error, HireTeamMemberInput>({
    mutationFn: input => apiWrite<HireTeamMemberResult>("/equipe/membres", { method: "POST", body: input }),
    onSuccess: invalidateTeam,
  })

  return { update, deactivate, reactivate, hire }
}
