<script setup lang="ts">
import { Button } from "@/components/ui/button"

const { t } = useI18n()
const { storefrontUrl } = useRuntimeConfig().public
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-sm">
    <div class="flex h-16 w-full items-center gap-3 px-3 sm:px-4 lg:px-6">
      <AdminMobileNavigation />
      <NuxtLinkLocale
        to="/"
        :aria-label="t('admin.brandLabel')"
        class="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:hidden"
      >
        <BrandWordmark size="sm" />
      </NuxtLinkLocale>

      <div class="hidden min-w-0 flex-1 justify-center lg:flex">
        <AdminModuleSearch />
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button v-if="storefrontUrl" as-child class="hidden xl:inline-flex">
          <a :href="storefrontUrl" target="_blank" rel="noopener noreferrer">
            {{ t("admin.marketplace") }}
            <Icon name="ph:arrow-square-out" data-icon="inline-end" aria-hidden="true" />
          </a>
        </Button>
        <LanguageSwitcher />
        <AdminProfileMenu />
      </div>
    </div>
  </header>
</template>
