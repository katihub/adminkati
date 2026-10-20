<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border/70 bg-background">
    <div class="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-10">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <NuxtLinkLocale
          to="/"
          :aria-label="t('admin.brandLabel')"
          class="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <BrandWordmark size="sm" />
        </NuxtLinkLocale>
        <div class="flex flex-1 justify-center">
          <AdminNavigation />
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <LanguageSwitcher />
        <AdminProfileMenu />
      </div>
    </div>
  </header>
</template>
