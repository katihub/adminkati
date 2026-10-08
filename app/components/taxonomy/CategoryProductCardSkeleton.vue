<template>
  <div
    data-testid="category-product-skeleton"
    class="flex h-full animate-pulse flex-col overflow-hidden rounded-2xl bg-muted"
    aria-hidden="true"
  >
    <div class="aspect-video bg-foreground/10" />
    <div class="flex flex-1 flex-col gap-3 p-4">
      <div class="flex h-10 flex-col justify-center gap-2">
        <div class="h-3 w-11/12 rounded-md bg-foreground/10" />
        <div class="h-3 w-7/12 rounded-md bg-foreground/10" />
      </div>
      <div class="mt-auto flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2">
        <div class="h-3 w-2/5 rounded-md bg-foreground/10" />
        <div class="h-[22px] w-16 rounded-full bg-foreground/10" />
      </div>
    </div>
  </div>
</template>
