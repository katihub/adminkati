import { toPublicSession } from "../../server/utils/session"

export default defineNuxtPlugin({
  name: "auth-session",
  dependsOn: ["vue-query"],
  setup(nuxtApp) {
    const session = useRequestEvent()?.context.session
    if (session) nuxtApp.$queryClient.setQueryData(["v1", "moi"], toPublicSession(session))
  },
})
