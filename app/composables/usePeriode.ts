import type { Periode } from "@/types/api/statistiques"
import { computed } from "vue"
import { parsePeriode } from "@/utils/periode"

export function usePeriode() {
  const route = useRoute()
  const router = useRouter()

  const periode = computed<Periode>({
    get: () => parsePeriode(route.query.periode),
    set: value => {
      void router.replace({
        query: {
          ...route.query,
          periode: value,
        },
      })
    },
  })

  return { periode }
}
