import type { TeamRole, UpdateTeamMemberInput } from "@/types/api/equipe"

export function buildTeamMemberUpdate(input: {
  name: string
  telephone: string
  comptoirs: string[]
  roles: TeamRole[]
  allowRoleEdit: boolean
}): UpdateTeamMemberInput | null {
  const nom = input.name.trim()
  if (!nom) return null

  return {
    nom,
    telephone: input.telephone.trim() || null,
    // Toujours envoyée, `[]` compris : c'est ainsi qu'on rend un membre à toute
    // la boutique. L'omettre laisserait son ancien périmètre en place.
    comptoirs: [...input.comptoirs],
    ...(input.allowRoleEdit ? { roles: input.roles } : {}),
  }
}
