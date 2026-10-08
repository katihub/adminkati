import process from "node:process"
import { assertAiConfig } from "../utils/ai/config"

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  if (config.sessionPassword.length < 32) throw new Error("NUXT_SESSION_PASSWORD must be set to at least 32 characters")
  assertAiConfig(config, process.env.NODE_ENV)
})
