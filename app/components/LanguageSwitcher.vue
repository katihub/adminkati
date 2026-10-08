<script setup lang="ts">
import type { ButtonVariants } from "@/components/ui/button"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type LocaleCode = "en" | "fr"
interface LocaleOption {
  code: LocaleCode
  flag: string
  labelKey: string
}

interface Props {
  variant?: ButtonVariants["variant"]
  embedded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: "outline",
  embedded: false,
})

const languageStorageKey = "NT-LANG"
const localeOptions = [
  {
    code: "en",
    flag: "circle-flags:gb",
    labelKey: "locales.en",
  },
  {
    code: "fr",
    flag: "circle-flags:fr",
    labelKey: "locales.fr",
  },
] satisfies [LocaleOption, ...LocaleOption[]]
const defaultLocaleOption = localeOptions[0]

const { locale, t } = useI18n({ useScope: "local" })
const switchLocalePath = useSwitchLocalePath()
const router = useRouter()

const currentLocale = computed<LocaleOption>(() => {
  return localeOptions.find(option => option.code === locale.value) ?? defaultLocaleOption
})

function persistLocale(code: LocaleCode) {
  if (import.meta.client) window.localStorage.setItem(languageStorageKey, code)
}

async function switchLanguage(code: LocaleCode) {
  persistLocale(code)

  if (code === locale.value) return

  await router.push(switchLocalePath(code))
}
</script>

<template>
  <template v-if="props.embedded">
    <DropdownMenuItem
      v-for="option in localeOptions"
      :key="option.code"
      class="gap-2"
      :data-testid="`language-switcher-option-${option.code}`"
      @select="switchLanguage(option.code)"
    >
      <Icon :name="option.flag" class="size-4" />
      <span>{{ t(option.labelKey) }}</span>
    </DropdownMenuItem>
  </template>
  <DropdownMenu v-else>
    <DropdownMenuTrigger as-child>
      <Button :variant="variant" size="sm" :aria-label="t('label')" data-testid="language-switcher-trigger">
        <Icon :name="currentLocale.flag" data-icon="inline-start" />
        <span>{{ t(currentLocale.labelKey) }}</span>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end">
      <DropdownMenuGroup>
        <DropdownMenuItem
          v-for="option in localeOptions"
          :key="option.code"
          class="gap-2"
          :data-testid="`language-switcher-option-${option.code}`"
          @select="switchLanguage(option.code)"
        >
          <Icon :name="option.flag" class="size-4" />
          <span>{{ t(option.labelKey) }}</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<i18n lang="json">
{
  "en": {
    "label": "Language",
    "locales": {
      "en": "English",
      "fr": "French"
    }
  },
  "fr": {
    "label": "Langue",
    "locales": {
      "en": "Anglais",
      "fr": "Français"
    }
  }
}
</i18n>
