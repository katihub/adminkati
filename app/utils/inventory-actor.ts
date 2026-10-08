import type { TeamMember } from "@/types/api/equipe"
import type { PublicSession } from "@/types/session"

type ActorMember = Pick<TeamMember, "nom" | "courriel">
type ActorViewer = Pick<PublicSession, "nom" | "courriel">

interface ActorInput {
  member: ActorMember | null
  /** The signed-in member when the movement is theirs, otherwise nothing. */
  viewer?: ActorViewer | null
  roleLabel: string
  unknownLabel: string
}

function fallbackName({ member, roleLabel, unknownLabel }: ActorInput) {
  return member?.nom || roleLabel || unknownLabel
}

export function resolveActor(input: ActorInput) {
  const { member, viewer } = input
  return {
    name: viewer ? viewer.nom : fallbackName(input),
    email: member ? member.courriel : (viewer?.courriel ?? null),
  }
}
