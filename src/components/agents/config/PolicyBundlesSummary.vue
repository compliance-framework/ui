<template>
  <section class="space-y-2" data-test="bundles-summary">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
        Policy bundles
      </h4>
      <RouterLink
        v-if="ws"
        :to="policiesRoute()"
        class="text-xs text-sky-700 hover:underline dark:text-sky-300"
        data-test="open-policies"
      >
        <i class="pi pi-pencil mr-1 text-[0.7rem]" />{{
          ws.canEdit.value
            ? 'Edit in the Policies view'
            : 'Open the Policies view'
        }}
      </RouterLink>
    </div>
    <p v-if="!rows.length" class="text-sm text-gray-500 dark:text-slate-400">
      No inline policy bundles.
    </p>
    <div
      v-for="row in rows"
      :id="`agent-bundle-${row.name}`"
      :key="row.name"
      class="rounded-md border border-ccf-300 p-3 text-sm dark:border-slate-700"
      :class="{ 'ring-2 ring-sky-400': highlight === row.name }"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-mono font-semibold">{{ row.name }}</span>
        <ProvenanceBadge :provenance="row.provenance" />
        <span v-if="row.extends" class="text-gray-500 dark:text-slate-400">
          extends
          <span class="font-mono text-xs break-all">{{ row.extends }}</span>
        </span>
        <ConfigPill
          v-if="ws?.draft.pendingAt(`/policy_bundles/${row.name}`)"
          severity="info"
          :data-test="`bundle-pending-${row.name}`"
          >pending changes</ConfigPill
        >
        <RouterLink
          v-if="ws"
          :to="policiesRoute(row.name)"
          class="ml-auto text-xs text-sky-700 hover:underline dark:text-sky-300"
          :data-test="`open-bundle-${row.name}`"
          >Open</RouterLink
        >
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
        {{ row.modules }} module{{ row.modules === 1 ? '' : 's' }} ·
        {{ row.deleted }} deleted
        <template v-if="row.age"> · added {{ row.age }}</template>
      </p>
      <p v-if="row.vendorUnknown" class="mt-1 text-xs text-gray-400">
        The vendor file list appears after an instance reports this bundle.
      </p>
      <ul
        v-if="row.files.length"
        class="mt-2 space-y-0.5 text-xs"
        :data-test="`summary-files-${row.name}`"
      >
        <li
          v-for="f in row.files"
          :key="f.path"
          class="flex gap-2"
          :data-state="f.state"
        >
          <span
            class="font-mono"
            :class="{ 'line-through': f.state === 'deleted' }"
            >{{ f.path }}</span
          >
          <span class="text-gray-500">{{ FILE_STATE_LABELS[f.state] }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
  ConfigDoc,
  OverlayDoc,
  PolicyBundleDoc,
  PolicyBundleReport,
} from '@/types/agent-config';
import {
  bundleFileStates,
  vendorFilesFor,
} from '@/utils/agent-config/policy-files';
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import { FILE_STATE_LABELS } from './constants';
import { bundleProvenance } from '@/utils/agent-config/provenance';
import { formatRelative } from '@/utils/agent-config/display';
import ProvenanceBadge from './ProvenanceBadge.vue';
import ConfigPill from './ConfigPill.vue';
import { RouterLink } from 'vue-router';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';

const props = defineProps<{
  effective: ConfigDoc | null;
  base: ConfigDoc | null;
  overlay: OverlayDoc | null;
  bundlesFirstSeen?: Record<string, string>;
  highlight?: string | null;
  /** The instance's reported bundles (vendor file lists, R10). */
  reports?: PolicyBundleReport[] | null;
}>();

const ws = useWorkspace();
function policiesRoute(bundle?: string) {
  return {
    name: 'admin-agent-policies',
    params: { id: ws?.agentId ?? '' },
    ...(bundle ? { query: { bundle } } : {}),
  };
}

function asBundle(v: unknown): PolicyBundleDoc | null {
  return isPlainObject(v) ? (v as PolicyBundleDoc) : null;
}

// Read-only variant of the editor's file table (U4.1).
function fileInfo(name: string, b: PolicyBundleDoc) {
  const vendor = b.extends
    ? vendorFilesFor(name, b, props.reports ?? null)
    : [];
  const files = bundleFileStates(
    vendor,
    asBundle(props.base?.policy_bundles?.[name]),
    asBundle(
      (props.overlay?.policy_bundles as Record<string, unknown> | undefined)?.[
        name
      ],
    ),
  ).map((f) => ({ path: f.path, state: f.state }));
  return { files, vendorUnknown: vendor === null };
}

const rows = computed(() =>
  Object.entries(props.effective?.policy_bundles ?? {})
    .filter(([, b]) => b && typeof b === 'object')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, b]) => ({
      name,
      extends: b?.extends ?? null,
      modules: Object.keys(b?.modules ?? {}).length,
      deleted: (b?.delete ?? []).length,
      provenance: bundleProvenance(name, props.base ?? {}, props.overlay ?? {}),
      age: formatRelative(props.bundlesFirstSeen?.[name]),
      ...fileInfo(name, b ?? {}),
    })),
);
</script>
