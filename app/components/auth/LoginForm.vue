<script setup lang="ts">
import type { LoginInput } from "@/schemas/login"
import { computed, reactive, ref } from "vue"
import { Button } from "@/components/ui/button"
import { loginSchema } from "@/schemas/login"

interface Props {
  pending?: boolean
  error?: string
}

type LoginField = keyof LoginInput

defineProps<Props>()

const emit = defineEmits<{ submit: [values: LoginInput] }>()

const { t } = useI18n()

const fields = ["email", "password"] as const
const values = reactive<Record<LoginField, string>>({ email: "", password: "" })
const errorKeys = reactive<Record<LoginField, string>>({ email: "", password: "" })
const passwordVisible = ref(false)

/**
 * A field only starts reacting to keystrokes once it has already been rejected,
 * so nobody is told they are wrong while still filling the form in.
 */
const validatesOnInput = reactive<Record<LoginField, boolean>>({ email: false, password: false })

const errors = computed(() => ({
  email: errorKeys.email ? t(errorKeys.email) : "",
  password: errorKeys.password ? t(errorKeys.password) : "",
}))

function parse() {
  return loginSchema.safeParse({ email: values.email, password: values.password })
}

function onFieldInput(field: LoginField, value: string) {
  values[field] = value

  if (!validatesOnInput[field]) return

  const result = parse()

  errorKeys[field] = result.success ? "" : (toFieldErrorKeys(result.error)[field] ?? "")
}

function clearFieldErrors() {
  for (const field of fields) errorKeys[field] = ""
}

function applyFieldErrors(keys: Partial<Record<LoginField, string>>) {
  for (const field of fields) {
    errorKeys[field] = keys[field] ?? ""
    validatesOnInput[field] ||= Boolean(keys[field])
  }
}

function onSubmit() {
  const result = parse()

  if (result.success) {
    clearFieldErrors()
    emit("submit", result.data)
    return
  }

  applyFieldErrors(toFieldErrorKeys(result.error))
}
</script>

<template>
  <form class="w-full max-w-lg" novalidate @submit.prevent="onSubmit">
    <div class="space-y-4">
      <FormTextField
        :model-value="values.email"
        :label="t('auth.login.email.label')"
        :placeholder="t('auth.login.email.placeholder')"
        :error="errors.email"
        type="email"
        autocomplete="email"
        required
        data-testid="login-email"
        @update:model-value="onFieldInput('email', $event)"
      />

      <FormTextField
        :model-value="values.password"
        :label="t('auth.login.password.label')"
        :placeholder="t('auth.login.password.placeholder')"
        :error="errors.password"
        :type="passwordVisible ? 'text' : 'password'"
        autocomplete="current-password"
        required
        data-testid="login-password"
        @update:model-value="onFieldInput('password', $event)"
      >
        <template #suffix>
          <Button
            type="button"
            variant="ghost"
            class="size-11 rounded-lg px-0 text-muted-foreground"
            :aria-label="passwordVisible ? t('auth.login.password.hide') : t('auth.login.password.show')"
            :aria-pressed="passwordVisible"
            data-testid="login-password-toggle"
            @click="passwordVisible = !passwordVisible"
          >
            <Icon :name="passwordVisible ? 'ph:eye-slash' : 'ph:eye'" size="22" />
          </Button>
        </template>
      </FormTextField>
    </div>

    <NuxtLinkLocale
      to="/forgot-password"
      class="mt-3 inline-flex min-h-11 items-center rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      data-testid="login-forgot-password"
    >
      {{ t("auth.login.forgotPassword") }}
    </NuxtLinkLocale>

    <p
      v-if="error"
      class="mt-6 flex items-start gap-2 text-sm text-destructive"
      role="alert"
      data-testid="login-form-error"
    >
      <Icon name="ph:warning-circle" class="mt-0.5 size-5 shrink-0" />
      <span>{{ error }}</span>
    </p>

    <Button
      type="submit"
      class="mt-8 h-16 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground gap-x-3 hover:bg-primary/90"
      :disabled="pending"
      :aria-busy="pending ? true : undefined"
      data-testid="login-submit"
    >
      <Spinner v-if="pending" data-icon="inline-start" />
      {{ pending ? t("auth.login.submitPending") : t("auth.login.submit") }}
    </Button>
  </form>
</template>
