<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4">
    <h1 class="text-4xl font-bold">404</h1>
    <p class="text-lg text-[var(--ui-v2-muted-foreground)]">Page not found.</p>
    <router-link :to="{ name: 'home' }" class="underline">
      Go to home
    </router-link>
  </div>
</template>
