<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import lightMiniLogo from '@/assets/logo-light-mini.svg';
import darkMiniLogo from '@/assets/logo-dark-mini.svg';

const route = useRoute();

const routeEyebrows: Record<string, string> = {
  login: 'Auth Portal',
  'forgot-password': 'Password Recovery',
  'password-reset': 'Reset Password',
  'sso-callback': 'SSO Callback',
  logout: 'Signing Out',
};

const pageEyebrow = computed(() => {
  const name = route.name;
  if (!name) {
    return 'Auth Portal';
  }
  return routeEyebrows[String(name)] ?? 'Auth Portal';
});
</script>

<template>
  <div class="ui-v2 min-h-screen">
    <div
      class="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[560px_minmax(0,1fr)]"
    >
      <aside
        class="hidden border-r border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-10 py-8 lg:flex lg:flex-col lg:gap-8"
      >
        <div
          class="flex items-center gap-2 ui-v2-label text-[var(--ui-v2-foreground)]"
        >
          <img
            alt="CCF mark"
            :src="lightMiniLogo"
            class="h-3 w-3 object-contain dark:hidden"
          />
          <img
            alt="CCF mark"
            :src="darkMiniLogo"
            class="hidden h-3 w-3 object-contain dark:block"
          />
          <span class="ui-v2-logo text-[var(--ui-v2-foreground)]">CCF</span>
        </div>

        <div class="space-y-4">
          <h1 class="ui-v2-title text-[var(--ui-v2-foreground)]">
            Secure Compliance Workspace
          </h1>
          <p class="max-w-[28ch] text-[var(--ui-v2-muted-foreground)]">
            Sign in to manage assets, controls, evidence, and workflow execution
            for your compliance program.
          </p>
        </div>

        <ul class="ui-v2-nav space-y-2">
          <li class="flex items-start gap-3 text-[var(--ui-v2-foreground)]">
            <span class="font-bold text-[var(--ui-v2-primary)]">01</span>
            <span>Single source of readiness data</span>
          </li>
          <li class="flex items-start gap-3 text-[var(--ui-v2-foreground)]">
            <span class="font-bold text-[var(--ui-v2-primary)]">02</span>
            <span>Clear feedback for every workflow state</span>
          </li>
          <li class="flex items-start gap-3 text-[var(--ui-v2-foreground)]">
            <span class="font-bold text-[var(--ui-v2-primary)]">03</span>
            <span>Reliable trace from control to evidence</span>
          </li>
        </ul>

        <div
          class="mt-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
        >
          <p class="ui-v2-label mb-2 text-[var(--ui-v2-secondary-foreground)]">
            Security
          </p>
          <p class="text-[var(--ui-v2-muted-foreground)]">
            This workspace uses scoped sessions and signed callbacks. You will
            be prompted if your access context changes.
          </p>
        </div>
      </aside>

      <main
        class="flex min-h-screen flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10"
      >
        <header class="flex items-center justify-between gap-4">
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            {{ pageEyebrow }}
          </p>
          <div
            class="ui-v2-nav flex items-center gap-6 text-[var(--ui-v2-tertiary-foreground)]"
          >
            <span>Docs</span>
            <span>Support</span>
          </div>
        </header>

        <div
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-4 lg:hidden"
        >
          <p class="ui-v2-label mb-1 text-[var(--ui-v2-secondary-foreground)]">
            Secure Compliance Workspace
          </p>
          <p class="text-[var(--ui-v2-muted-foreground)]">
            Manage controls, workflows, and evidence from one scoped workspace.
          </p>
        </div>

        <section
          class="mx-auto flex w-full max-w-[640px] grow items-start pb-10 lg:items-center"
        >
          <RouterView v-slot="{ Component }">
            <component :is="Component" />
          </RouterView>
        </section>
      </main>
    </div>
  </div>
</template>
