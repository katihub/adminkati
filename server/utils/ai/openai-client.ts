import type { ModelResponse, ProductCopyModelClient } from "./product-copy-service"
import OpenAI from "openai"

/** `maxRetries: 0` because the handler owns the single image-less retry and a hidden SDK retry would double the bill. */
export function createOpenAiProductCopyClient(apiKey: string): ProductCopyModelClient {
  const openai = new OpenAI({ apiKey, maxRetries: 0 })
  return {
    async create(request, options) {
      const response = await openai.responses.create(request, { timeout: options.timeoutMs })
      return response as ModelResponse
    },
  }
}
