import type { Role } from "@/types/session"

/** Mirrors `Appelant` — ../NowTech-backend-/src/commun/garde/appelant.ts:21-24. */
export type ApiAppelant =
  | { type: "anonyme" }
  | { type: "client"; userId: string; courriel?: string }
  /** `comptoirs` is the caller's own perimeter; absent or empty means the whole shop. */
  | {
      type: "equipe"
      userId: string
      membreId: string
      nom: string
      roles: Role[]
      courriel: string
      comptoirs?: string[]
    }
