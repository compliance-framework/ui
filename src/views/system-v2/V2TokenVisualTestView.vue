<script setup lang="ts">
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';

type ColorToken = {
  token: string;
  value: string;
  usage: string;
  sampleTextToken?: string;
};

type TypographySample = {
  className: string;
  label: string;
  text: string;
};

const coreColorTokens: ColorToken[] = [
  {
    token: '--ui-v2-background',
    value: '#eff1f5',
    usage: 'Main page background',
    sampleTextToken: '--ui-v2-foreground',
  },
  {
    token: '--ui-v2-surface',
    value: '#e6e9ef',
    usage: 'Subsection background',
    sampleTextToken: '--ui-v2-foreground',
  },
  {
    token: '--ui-v2-card',
    value: '#dce0e8',
    usage: 'Card surfaces',
    sampleTextToken: '--ui-v2-foreground',
  },
  {
    token: '--ui-v2-border',
    value: '#ccd0da',
    usage: 'Default border',
    sampleTextToken: '--ui-v2-foreground',
  },
  {
    token: '--ui-v2-primary',
    value: '#df8e1d',
    usage: 'Primary actions and highlights',
    sampleTextToken: '--ui-v2-primary-foreground',
  },
  {
    token: '--ui-v2-info',
    value: '#1e66f5',
    usage: 'Informational elements',
    sampleTextToken: '--ui-v2-background',
  },
];

const semanticColorTokens: ColorToken[] = [
  {
    token: '--ui-v2-success',
    value: '#40a02b',
    usage: 'Success states',
    sampleTextToken: '--ui-v2-background',
  },
  {
    token: '--ui-v2-warning',
    value: '#df8e1d',
    usage: 'Warning states',
    sampleTextToken: '--ui-v2-primary-foreground',
  },
  {
    token: '--ui-v2-error',
    value: '#d20f39',
    usage: 'Error states',
    sampleTextToken: '--ui-v2-background',
  },
];

const typographySamples: TypographySample[] = [
  {
    className: 'ui-v2-title',
    label: 'ui-v2-title (40px max)',
    text: 'System Compliance Overview',
  },
  {
    className: 'ui-v2-section-title',
    label: 'ui-v2-section-title (18px)',
    text: 'Implementation Status',
  },
  {
    className: 'ui-v2-card-title',
    label: 'ui-v2-card-title (14px)',
    text: 'Weekly Delta',
  },
  {
    className: 'ui-v2-metric',
    label: 'ui-v2-metric (32px)',
    text: '128',
  },
  {
    className: 'ui-v2-nav',
    label: 'ui-v2-nav (12px uppercase)',
    text: 'NAVIGATION ITEM',
  },
  {
    className: 'ui-v2-label',
    label: 'ui-v2-label (12px uppercase)',
    text: 'METADATA LABEL',
  },
  {
    className: 'ui-v2-meta',
    label: 'ui-v2-meta (11px)',
    text: 'Updated 2026-03-04 14:26 UTC',
  },
  {
    className: 'ui-v2-logo',
    label: 'ui-v2-logo (14px uppercase)',
    text: 'CCF',
  },
];

const spacingScale = [4, 8, 12, 16, 20, 24, 32, 40];

function swatchStyle(token: string): { backgroundColor: string } {
  return {
    backgroundColor: `var(${token})`,
  };
}

function sampleTextStyle(token?: string): { color?: string } {
  if (!token) {
    return {};
  }
  return {
    color: `var(${token})`,
  };
}

function spacingBarStyle(value: number): { width: string } {
  return {
    width: `${value * 5}px`,
  };
}
</script>

<template>
  <div class="space-y-8">
    <V2PageHeader
      eyebrow="Sandbox"
      title="V2 Token Visual Test"
      description="Visual reference for colors, typography, spacing, and border/radius rules used by the V2 system."
    />

    <section class="ui-v2-surface-card p-6">
      <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
        Color Tokens
      </p>
      <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="token in coreColorTokens"
          :key="token.token"
          class="ui-v2-surface-base p-4"
        >
          <div
            class="ui-v2-border-standard h-12"
            :style="swatchStyle(token.token)"
          />
          <p class="ui-v2-nav mt-3 text-[var(--ui-v2-foreground)]">
            {{ token.token }}
          </p>
          <p class="ui-v2-meta mt-1 text-[var(--ui-v2-muted-foreground)]">
            {{ token.value }}
          </p>
          <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
            {{ token.usage }}
          </p>
          <p
            class="ui-v2-meta mt-2"
            :style="sampleTextStyle(token.sampleTextToken)"
          >
            Sample text
          </p>
        </article>
      </div>

      <div class="mt-6 grid gap-4 md:grid-cols-3">
        <article
          v-for="token in semanticColorTokens"
          :key="token.token"
          class="ui-v2-surface-base p-4"
        >
          <div
            class="ui-v2-border-standard h-12"
            :style="swatchStyle(token.token)"
          />
          <p class="ui-v2-nav mt-3 text-[var(--ui-v2-foreground)]">
            {{ token.token }}
          </p>
          <p class="ui-v2-meta mt-1 text-[var(--ui-v2-muted-foreground)]">
            {{ token.value }}
          </p>
          <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
            {{ token.usage }}
          </p>
        </article>
      </div>
    </section>

    <section class="ui-v2-surface-card p-6">
      <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
        Typography Scale
      </p>
      <div class="mt-4 space-y-4">
        <article
          v-for="sample in typographySamples"
          :key="sample.className"
          class="ui-v2-surface-base p-4"
        >
          <p class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]">
            {{ sample.label }}
          </p>
          <p class="mt-3" :class="sample.className">{{ sample.text }}</p>
        </article>
      </div>
    </section>

    <section class="ui-v2-surface-card p-6">
      <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
        Spacing Scale
      </p>
      <div class="mt-4 space-y-3">
        <div
          v-for="value in spacingScale"
          :key="value"
          class="ui-v2-surface-base flex items-center gap-4 p-3"
        >
          <span class="ui-v2-nav w-12 text-[var(--ui-v2-foreground)]"
            >{{ value }}px</span
          >
          <div
            class="ui-v2-radius-none h-4 border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)]"
            :style="spacingBarStyle(value)"
          />
        </div>
      </div>
    </section>

    <section class="ui-v2-surface-card p-6">
      <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
        Border and Radius Utilities
      </p>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <article class="ui-v2-surface-base p-4">
          <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
            ui-v2-border-standard
          </p>
          <div
            class="ui-v2-border-standard mt-3 h-16 bg-[var(--ui-v2-background)]"
          />
        </article>

        <article class="ui-v2-surface-muted p-4">
          <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
            ui-v2-surface-muted
          </p>
          <div class="ui-v2-border-standard mt-3 h-16 bg-[var(--ui-v2-card)]" />
        </article>

        <article class="ui-v2-surface-base p-4">
          <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
            ui-v2-interactive
          </p>
          <button
            type="button"
            class="ui-v2-nav ui-v2-interactive mt-3 px-4 py-2"
          >
            Sample Action
          </button>
        </article>
      </div>
    </section>
  </div>
</template>
