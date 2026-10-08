<template>
  <div class="flex flex-col gap-2 p-3">
    <Skeleton v-for="n in 7" :key="n" data-testid="team-list-skeleton" class="h-14 w-full shrink-0 rounded-2xl" />
  </div>
</template>
