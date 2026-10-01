<template>
  <nav class="space-y-4" aria-label="Policy bundles" data-test="bundle-list">
    <section class="space-y-1">
      <div class="flex items-center justify-between gap-2">
        <h3
          class="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-slate-400"
        >
          Inline bundles
        </h3>
        <SecondaryButton
          v-if="canEdit"
          size="small"
          data-test="create-bundle"
          @click="$emit('create', null)"
        >
          <i class="pi pi-plus mr-1 text-xs" />Create
        </SecondaryButton>
      </div>
      <p
        v-if="!bundles.length"
        class="text-xs text-gray-500 dark:text-slate-400"
      >
        No inline bundles.
      </p>
      <ul class="space-y-1">
        <li v-for="b in bundles" :key="b.name">
          <button
            type="button"
            class="w-full rounded-md border px-2 py-1.5 text-left text-sm"
            :class="
              selected === b.name
                ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-500/10'
                : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            "
            :aria-current="selected === b.name ? 'true' : undefined"
            :data-test="`bundle-item-${b.name}`"
            @click="$emit('select-bundle', b.name)"
          >
            <span class="flex items-center gap-1.5">
              <span
                v-if="b.errors || b.warnings"
                class="inline-block h-2 w-2 rounded-full"
                :class="b.errors ? 'bg-red-500' : 'bg-amber-500'"
                :aria-label="b.errors ? 'Has errors' : 'Has warnings'"
                role="img"
              />
              <span
                class="truncate font-mono font-medium"
                :class="{ 'line-through opacity-60': b.deleted }"
                >{{ b.name }}</span
              >
              <span
                v-if="b.pending"
                class="ml-auto rounded-full bg-sky-100 px-1.5 text-[0.65rem] text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
                >{{ b.deleted ? 'deleted' : 'pending' }}</span
              >
            </span>
            <span
              v-if="b.extends"
              class="block truncate text-xs text-gray-500 dark:text-slate-400"
              :title="b.extends"
              >extends {{ b.extends }}</span
            >
            <span class="block text-xs text-gray-500 dark:text-slate-400">
              {{
                b.usedBy.length ? `used by ${b.usedBy.join(', ')}` : 'unused'
              }}
            </span>
          </button>
          <button
            v-if="b.deleted && canEdit"
            type="button"
            class="ml-2 text-xs text-sky-700 hover:underline dark:text-sky-300"
            :data-test="`undo-delete-${b.name}`"
            @click="$emit('undo-delete', b.name)"
          >
            Undo delete
          </button>
        </li>
      </ul>
    </section>

    <section class="space-y-1">
      <h3
        class="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-slate-400"
      >
        Sources plugins use
      </h3>
      <p
        v-if="!sources.length"
        class="text-xs text-gray-500 dark:text-slate-400"
      >
        No plugin loads a policy source directly.
      </p>
      <ul class="space-y-1">
        <li v-for="s in sources" :key="s.source">
          <button
            type="button"
            class="w-full rounded-md border px-2 py-1.5 text-left text-sm"
            :class="
              selectedSource === s.source
                ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-500/10'
                : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            "
            :aria-current="selectedSource === s.source ? 'true' : undefined"
            :data-test="`source-item-${s.source}`"
            @click="$emit('select-source', s.source)"
          >
            <span class="block font-mono text-xs break-all">{{
              s.source
            }}</span>
            <span class="block text-xs text-gray-500 dark:text-slate-400"
              >used by {{ s.plugins.join(', ') }}</span
            >
          </button>
        </li>
      </ul>
    </section>
  </nav>
</template>

<script setup lang="ts">
// Left column of the Policies view (R68): inline bundles of the draft and the policy sources
// plugins load directly (each can be the start of a new bundle).
import SecondaryButton from '@/volt/SecondaryButton.vue';

export interface BundleListItem {
  name: string;
  extends: string | null;
  usedBy: string[];
  /** The draft changes this bundle. */
  pending: boolean;
  /** Deleted by the pending draft. */
  deleted: boolean;
  errors: number;
  warnings: number;
}

defineProps<{
  bundles: BundleListItem[];
  sources: { source: string; plugins: string[] }[];
  selected: string | null;
  selectedSource: string | null;
  canEdit: boolean;
}>();
defineEmits<{
  'select-bundle': [name: string];
  'select-source': [source: string];
  create: [source: string | null];
  'undo-delete': [name: string];
}>();
</script>
