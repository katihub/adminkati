import { watch } from "vue"

const languageStorageKey = "NT-LANG"
type LocaleCode = "en" | "fr"

const supportedLocales = new Set(["en", "fr"])

export default defineNuxtPlugin({
  name: "i18n-storage",
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const { locale, setLocale } = nuxtApp.$i18n
    const storedLocale = readStoredValue(languageStorageKey)

    if (isLocaleCode(storedLocale) && storedLocale !== locale.value) {
      void setLocale(storedLocale)
    } else if (isLocaleCode(locale.value)) {
      writeStoredValue(languageStorageKey, locale.value)
    }

    watch(locale, value => {
      if (isLocaleCode(value)) writeStoredValue(languageStorageKey, value)
    })
  },
})

function isLocaleCode(value: string | null): value is LocaleCode {
  return typeof value === "string" && supportedLocales.has(value)
}
