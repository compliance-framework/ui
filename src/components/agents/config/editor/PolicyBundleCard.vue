<template>
  <article
    :id="`editor-bundle-${name}`"
    class="space-y-3 rounded-md border border-ccf-300 p-4 dark:border-slate-700"
    :data-test="`bundle-card-${name}`"
  >
    <header class="flex flex-wrap items-center gap-2">
      <h5 class="font-mono text-sm font-semibold">{{ name }}</h5>
      <span
        v-if="bundleDoc.extends"
        class="text-xs text-gray-500 dark:text-slate-400"
      >
        extends <span class="font-mono break-all">{{ bundleDoc.extends }}</span>
      </span>
      <ProvenanceBadge :provenance="provenance" />
      <ConfigPill
        v-if="problemCount"
        :severity="errorCount ? 'danger' : 'warn'"
        data-test="bundle-problems"
      >
        {{ problemCount }} problem{{ problemCount === 1 ? '' : 's' }}
      </ConfigPill>
      <span class="ml-auto flex gap-2">
        <TertiaryButton
          v-if="fileDefined && inOverlay"
          size="small"
          data-test="bundle-reset"
          @click="ops.resetBundle(name)"
        >
          Reset to file
        </TertiaryButton>
        <TertiaryButton
          size="small"
          data-test="bundle-delete"
          @click="confirmDelete"
          >Delete bundle</TertiaryButton
        >
        <TertiaryButton
          size="small"
          :aria-expanded="expanded"
          data-test="bundle-toggle"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Collapse' : 'Expand' }}
        </TertiaryButton>
      </span>
    </header>
    <p class="text-xs text-gray-500 dark:text-slate-400" data-test="bundle-age">
      {{ ageText }}
      <span
        v-if="!fileDefined"
        class="ml-1 text-amber-700 dark:text-amber-300"
        data-test="temporary-hint"
      >
        {{ TEMPORARY_POLICY_HINT }}
      </span>
    </p>

    <BundleWiringChips
      :bundle="name"
      :plugins="ops.pluginNames.value"
      :ops="ops"
    />

    <template v-if="expanded">
      <BundleFileList
        :bundle="name"
        :rows="rows"
        :vendor-known="vendorFiles !== null"
        :has-extends="!!bundleDoc.extends"
        :problems="problemsByPath"
        :selected="selected"
        :ops="ops"
        @select="selected = $event"
      />
      <RegoModuleEditor
        v-if="selected && selectedText !== null"
        :key="selected"
        :bundle="name"
        :path="selected"
        :model-value="selectedText"
        :diagnostics="diagnosticsFor(name, selected)"
        @update:model-value="ops.setModule(name, selected!, $event)"
      />

      <details class="text-sm" data-test="bundle-data">
        <summary
          class="cursor-pointer text-xs font-medium tracking-wide text-gray-500 uppercase"
        >
          Bundle data
        </summary>
        <p
          v-if="dataFileModule"
          class="mt-1 text-xs text-gray-500"
          data-test="data-disabled"
        >
          <i class="pi pi-lock mr-1" />This bundle has a
          {{ dataFileModule }} module; data and a root data file are mutually
          exclusive.
        </p>
        <CodeEditor
          v-else
          :model-value="dataText"
          language="json"
          min-height="120px"
          :label="`Data of ${name}`"
          @update:model-value="onData"
        />
        <p v-if="dataError" class="text-xs text-red-600">{{ dataError }}</p>
      </details>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { CodeEditor } from '@/components/code-editor';
import type { PolicyBundleDoc, PolicyError } from '@/types/agent-config';
import {
  bundleFileStates,
  vendorFilesFor,
} from '@/utils/agent-config/policy-files';
import { bundleProvenance } from '@/utils/agent-config/provenance';
import { formatRelative } from '@/utils/agent-config/display';
import {
  deepEqual,
  isPlainObject,
  mergePatch,
} from '@/utils/agent-config/merge-patch';
import { replacingPatch } from '@/utils/agent-config/overlay-ops';
import { DATA_FILE_RE } from '@/utils/agent-config/validation';
import ProvenanceBadge from '../ProvenanceBadge.vue';
import ConfigPill from '../ConfigPill.vue';
import { TEMPORARY_POLICY_HINT } from '../constants';
import BundleWiringChips from './BundleWiringChips.vue';
import BundleFileList from './BundleFileList.vue';
import RegoModuleEditor from './RegoModuleEditor.vue';
import type { BundleOps } from './useBundleOps';
import { useEditor } from './useEditor';

const props = defineProps<{
  name: string;
  ops: BundleOps;
  diagnosticsFor: (bundle: string, path: string) => PolicyError[];
  initiallyExpanded?: boolean;
}>();

const confirm = useConfirm();
const { draft, ctx } = useEditor();
const expanded = ref(!!props.initiallyExpanded);
const selected = ref<string | null>(null);

const bundleDoc = computed<PolicyBundleDoc>(
  () => props.ops.bundles.value[props.name] ?? {},
);
const fileDefined = computed(() => !!props.ops.fileBundle(props.name));
const inOverlay = computed(
  () => draft.overlay.value.policy_bundles?.[props.name] !== undefined,
);
const provenance = computed(() =>
  bundleProvenance(
    props.name,
    ctx.placeholderBase.value ?? {},
    draft.overlay.value,
  ),
);
const placeholderDetail = computed(() =>
  ctx.placeholderInstanceId.value
    ? ctx.instanceDetails.value.get(ctx.placeholderInstanceId.value)
    : undefined,
);
// Standalone bundles (no extends) have no vendor files at all.
const vendorFiles = computed(() =>
  bundleDoc.value.extends
    ? vendorFilesFor(
        props.name,
        bundleDoc.value,
        placeholderDetail.value?.policyBundles ?? null,
      )
    : [],
);
const rows = computed(() =>
  bundleFileStates(
    vendorFiles.value,
    props.ops.fileBundle(props.name),
    props.ops.overlayBundle(props.name),
  ),
);

const ageText = computed(() => {
  const seen = ctx.config.value.bundlesFirstSeen?.[props.name];
  if (seen) return `Added ${formatRelative(seen)}`;
  return fileDefined.value
    ? 'Defined in the agent file'
    : 'Defined in the overlay';
});

const problemsByPath = computed(() => {
  const out: Record<string, { errors: number; warnings: number }> = {};
  for (const r of rows.value) {
    const d = props.diagnosticsFor(props.name, r.path);
    if (!d.length) continue;
    out[r.path] = {
      errors: d.filter((x) => x.severity === 'error').length,
      warnings: d.filter((x) => x.severity !== 'error').length,
    };
  }
  return out;
});
const errorCount = computed(() =>
  Object.values(problemsByPath.value).reduce((n, p) => n + p.errors, 0),
);
const problemCount = computed(() =>
  Object.values(problemsByPath.value).reduce(
    (n, p) => n + p.errors + p.warnings,
    0,
  ),
);

const selectedText = computed(() => {
  if (!selected.value) return null;
  const t = bundleDoc.value.modules?.[selected.value];
  return typeof t === 'string' ? t : null;
});

// ---- data (valid JSON only; exclusive with a root data.json/yaml/yml module, R18) ----
const dataFileModule = computed(
  () =>
    Object.keys(bundleDoc.value.modules ?? {}).find((p) =>
      DATA_FILE_RE.test(p),
    ) ?? null,
);
const dataText = ref(JSON.stringify(bundleDoc.value.data ?? {}, null, 2));
const dataError = ref('');
watch(
  () => bundleDoc.value.data,
  (d) => {
    if (dataError.value) return;
    try {
      if (deepEqual(mergePatch({}, JSON.parse(dataText.value)), d ?? {}))
        return;
    } catch {
      return;
    }
    dataText.value = JSON.stringify(d ?? {}, null, 2);
  },
);
function onData(text: string) {
  dataText.value = text;
  try {
    const parsed = text.trim() ? JSON.parse(text) : {};
    if (!isPlainObject(parsed))
      throw new Error('Bundle data must be a JSON object');
    dataError.value = '';
    // Objects merge (RFC 7396): write the full target plus nulls for file keys the user
    // removed, never copying the file's masked values (R25).
    props.ops.setData(
      props.name,
      replacingPatch(props.ops.fileBundle(props.name)?.data, parsed) as Record<
        string,
        unknown
      >,
    );
  } catch (e) {
    dataError.value = (e as Error).message;
  }
}

function confirmDelete() {
  const users = props.ops.usedBy(props.name);
  confirm.require({
    header: 'Delete bundle',
    message: users.length
      ? `Delete "${props.name}" and remove inline:${props.name} from: ${users.join(', ')}?`
      : `Delete "${props.name}"?`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: () => props.ops.deleteBundle(props.name),
  });
}

defineExpose({ expanded, selected });
</script>
