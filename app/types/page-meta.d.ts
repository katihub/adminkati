import type { Role } from "@/types/session"

declare module "#app" {
  interface PageMeta {
    public?: boolean
    team?: boolean
    roles?: Role[]
  }
}

export {}
