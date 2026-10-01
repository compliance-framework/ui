<template>
  <div
    class="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_22rem_minmax(0,1fr)]"
    data-test="policies-workspace"
  >
    <!-- Left: bundles and sources -->
    <div class="min-w-0">
      <PolicyBundleList
        :bundles="bundleItems"
        :sources="sourceItems"
        :selected="sel.bundle"
        :selected-source="sel.source"
        :can-edit="canEdit"
        @select-bundle="selectBundle"
        @select-source="selectSource"
        @create="openCreate"
        @undo-delete="undoDelete"
      />
    </div>

    <!-- Center: the selected bundle's files (or a source's files) -->
    <div
      class="min-w-0 space-y-3 rounded-md border border-ccf-300 p-3 dark:border-slate-700"
    >
      <template v-if="sel.bundle && bundleDoc">
        <header class="space-y-1" data-test="bundle-header">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-mono text-sm font-semibold">{{ sel.bundle }}</h2>
            <ProvenanceBadge :provenance="provenance" />
          </div>
          <p
            v-if="bundleDoc.extends"
            class="text-xs break-all text-gray-500 dark:text-slate-400"
          >
            extends <span class="font-mono">{{ bundleDoc.extends }}</span>
          </p>
          <p class="text-xs text-gray-500 dark:text-slate-400">
            {{
              usedBy.length
                ? `Used by ${usedBy.join(', ')}`
                : 'Not used by any plugin'
            }}
          </p>
          <p
            v-if="!fileBundle"
            class="text-xs text-amber-700 dark:text-amber-300"
            data-test="temporary-hint"
          >
            {{ TEMPORARY_POLICY_HINT }}
          </p>
          <div class="flex flex-wrap gap-2 pt-1">
            <SecondaryButton
              v-if="canEdit"
              size="small"
              data-test="assign-bundle"
              @click="assignOpen = true"
            >
              Assign to plugins
            </SecondaryButton>
            <SecondaryButton
              size="small"
              :class="{ 'ring-2 ring-sky-400': sel.mode === 'data' }"
              data-test="open-data"
              @click="openData"
            >
              Bundle data
            </SecondaryButton>
            <TertiaryButton
              v-if="canEdit && fileBundle && overlayBundle"
              size="small"
              data-test="bundle-reset"
              @click="ops.resetBundle(sel.bundle)"
            >
              Reset to file
            </TertiaryButton>
            <TertiaryButton
              v-if="canEdit"
              size="small"
              data-test="bundle-delete"
              @click="confirmDelete"
            >
              Delete bundle
            </TertiaryButton>
          </div>
          <p class="text-[0.7rem] text-gray-400">{{ CROSS_BUNDLE_HELP }}</p>
        </header>
        <BundleFileTree
          :bundle="sel.bundle"
          :rows="rows"
          :vendor-known="vendorFiles !== null"
          :has-extends="!!bundleDoc.extends"
          :problems="problemsByPath"
          :selected="sel.file"
          :can-edit="canEdit"
          @action="onAction"
          @add-file="addFile"
          @delete-path="(p) => ops.deleteVendorFile(sel.bundle!, p)"
        />
      </template>

      <template v-else-if="sel.source">
        <header class="space-y-1" data-test="source-header">
          <h2 class="font-mono text-sm font-semibold break-all">
            {{ sel.source }}
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-400">
            Loaded directly by
            {{ (ops.sourceUsage.value.get(sel.source) ?? []).join(', ') }}.
            Create a bundle from it to override or delete its files.
          </p>
          <PrimaryButton
            v-if="canEdit"
            size="small"
            data-test="create-from-source"
            @click="openCreate(sel.source)"
          >
            Create a bundle from this source
          </PrimaryButton>
        </header>
        <p
          v-if="sourceFiles === null"
          class="text-xs text-amber-700 dark:text-amber-300"
        >
          The file list appears after an instance reports this source.
        </p>
        <ul v-else class="space-y-0.5 text-xs" data-test="source-files">
          <li
            v-for="f in sourceFiles"
            :key="f.path"
            class="flex items-center gap-2 rounded px-1 py-0.5"
            :class="{ 'bg-sky-50 dark:bg-sky-500/10': sel.file === f.path }"
          >
            <span class="font-mono">{{ f.path }}</span>
            <span v-if="f.package" class="text-gray-400">{{ f.package }}</span>
            <button
              type="button"
              class="ml-auto text-sky-700 hover:underline dark:text-sky-300"
              data-action="view"
              @click="openVendor(f.path)"
            >
              View
            </button>
          </li>
        </ul>
      </template>

      <p
        v-else
        class="text-sm text-gray-500 dark:text-slate-400"
        data-test="no-selection"
      >
        Select a bundle or a source on the left<template v-if="canEdit"
          >, or create a bundle</template
        >.
      </p>
    </div>

    <!-- Right: editor + validation -->
    <div class="min-w-0 space-y-3">
      <BundleDataEditor
        v-if="sel.mode === 'data' && sel.bundle && bundleDoc"
        :key="`data-${sel.bundle}`"
        :bundle="sel.bundle"
        :doc="bundleDoc"
        :file-bundle="fileBundle"
        :readonly="!canEdit"
        @update="(d) => ops.setData(sel.bundle!, d)"
      />
      <PolicyEditorPane
        v-else-if="
          sel.file && (sel.bundle || sel.source) && sel.mode !== 'data'
        "
        :bundle="sel.bundle ?? sel.source ?? ''"
        :path="sel.file"
        :mode="sel.mode === 'view' ? 'view' : 'edit'"
        :text="editorText"
        :loading="sel.mode === 'view' && vendorView.loading"
        :error="sel.mode === 'view' ? vendorView.error : null"
        :diagnostics="selectedDiagnostics"
        :readonly="!canEdit"
        :vendor-tests="vendorTestOffer"
        :can-override="canEdit && selectedRow?.state === 'inherited'"
        @update="(t) => ops.setModule(sel.bundle!, sel.file!, t)"
        @delete-tests="deleteVendorTests"
        @override="selectedRow && override(selectedRow)"
      />
      <p
        v-else
        class="rounded-md border border-dashed border-ccf-300 p-6 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400"
      >
        Open a file to view or edit it.
      </p>
      <PolicyValidationPanel
        :status="ws.preview.status.value"
        :error="ws.preview.error.value"
        :can-run="canEdit && ws.draft.isDirty.value && !ws.clientBlocked.value"
        :problems="allProblems"
        :issues="policyIssues"
        @run="ws.preview.retry()"
        @open="openProblem"
      />
    </div>

    <CreateBundleDialog
      v-model:visible="createOpen"
      :sources="sourceItems"
      :plugins="ops.pluginNames.value"
      :taken="ops.takenNames.value"
      :initial-source="createSource"
      :policy-only="ws.editorMode.value === 'policy-only'"
      :used-sources="ops.usedSourcesEverywhere.value"
      @create="onCreate"
    />
    <AssignBundleDialog
      v-if="sel.bundle"
      v-model:visible="assignOpen"
      :bundle="sel.bundle"
      :source="bundleDoc?.extends ?? null"
      :plugins="assignmentPlugins"
      @apply="onAssign"
    />
  </div>
</template>

<script setup lang="ts">
// The Policies workspace (R68): bundle list | file tree | full-height editor + validation.
// Every change goes to the shared pending-changes draft (R69), saved from the pending bar.
import { computed, reactive, ref, shallowRef, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import type {
  ConfigDoc,
  PolicyBundleDoc,
  PolicyError,
  PolicyFileReport,
} from '@/types/agent-config';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import {
  useVendorSources,
  vendorLoadError,
} from '@/composables/agent-config/useVendorSources';
import { getAt, isPrefix, pointer } from '@/utils/agent-config/json-pointer';
import { mergePatch } from '@/utils/agent-config/merge-patch';
import {
  bundleFileStates,
  sourceArtifact,
  vendorArtifactFor,
  vendorTestsFor,
  VENDOR_MISS_TEXT,
  type FileRow,
} from '@/utils/agent-config/policy-files';
import { bundleProvenance } from '@/utils/agent-config/provenance';
import { validationInstanceIds } from '@/utils/agent-config/instance-status';
import {
  moduleTemplate,
  newModulePolicyId,
  packageForPath,
} from '@/utils/agent-config/rego-template';
import ProvenanceBadge from '../config/ProvenanceBadge.vue';
import { CROSS_BUNDLE_HELP, TEMPORARY_POLICY_HINT } from '../config/constants';
import { moduleDiagnostics } from '../config/editor/policyDiagnostics';
import { useBundleOps, type AssignMode } from '../config/editor/useBundleOps';
import PolicyBundleList, { type BundleListItem } from './PolicyBundleList.vue';
import BundleFileTree, { type TreeAction } from './BundleFileTree.vue';
import PolicyEditorPane from './PolicyEditorPane.vue';
import PolicyValidationPanel from './PolicyValidationPanel.vue';
import BundleDataEditor from './BundleDataEditor.vue';
import CreateBundleDialog from './CreateBundleDialog.vue';
import AssignBundleDialog from './AssignBundleDialog.vue';
import type { AssignmentPlugin } from './PluginAssignmentRows.vue';

const props = defineProps<{ initialBundle?: string | null }>();

const ws = useWorkspace()!;
const draft = ws.draft;
const ops = useBundleOps();
const vendor = useVendorSources(ws.api);
const confirm = useConfirm();

const canEdit = computed(() => ws.canEdit.value && ws.ready.value);

// ---- Selection ----
type Mode = 'edit' | 'view' | 'data' | null;
const sel = reactive<{
  bundle: string | null;
  source: string | null;
  file: string | null;
  mode: Mode;
}>({ bundle: null, source: null, file: null, mode: null });

function selectBundle(name: string) {
  sel.bundle = name;
  sel.source = null;
  sel.file = null;
  sel.mode = null;
}
function selectSource(source: string) {
  sel.source = source;
  sel.bundle = null;
  sel.file = null;
  sel.mode = null;
}
// ?bundle=<name> opens that bundle once the draft is there.
watch(
  () =>
    ws.ready.value &&
    !!props.initialBundle &&
    !!ops.bundles.value[props.initialBundle],
  (ok) => {
    if (ok && !sel.bundle && !sel.source) selectBundle(props.initialBundle!);
  },
  { immediate: true },
);

// ---- Lists ----
const savedBundles = computed<Record<string, unknown>>(
  () =>
    mergePatch<ConfigDoc>(ws.placeholderBase.value ?? {}, draft.original.value)
      .policy_bundles ?? {},
);
const bundleItems = computed<BundleListItem[]>(() => {
  const names = new Set([
    ...Object.keys(ops.bundles.value),
    ...Object.keys(savedBundles.value).filter((n) => !!savedBundles.value[n]),
  ]);
  return Array.from(names)
    .sort()
    .map((name) => {
      const b = ops.bundles.value[name];
      const probs = problemsOfBundle(name);
      return {
        name,
        extends: typeof b?.extends === 'string' ? b.extends : null,
        usedBy: b ? ops.usedBy(name) : [],
        pending: draft.pendingAt(pointer('policy_bundles', name)),
        deleted: !b,
        errors: probs.errors,
        warnings: probs.warnings,
      };
    });
});
const sourceItems = computed(() =>
  Array.from(ops.sourceUsage.value.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, plugins]) => ({ source, plugins })),
);

// ---- Vendor files (R62: reports first, the artifact list when a report has none) ----
const artifactLists = shallowRef(new Map<string, PolicyFileReport[]>());
const requestedLists = new Set<string>();
function ensureArtifactList(digest: string) {
  if (requestedLists.has(digest)) return;
  requestedLists.add(digest);
  vendor
    .listFiles(digest)
    .then((list) => {
      const m = new Map(artifactLists.value);
      m.set(
        digest,
        list.files.map((f) => ({
          path: f.path,
          sha256: f.sha256,
          package: f.package,
        })),
      );
      artifactLists.value = m;
    })
    .catch(() => requestedLists.delete(digest));
}

/** Reported vendor files of bundle `name` (null = unknown). */
function vendorFilesOf(name: string): PolicyFileReport[] | null {
  const b = ops.bundles.value[name];
  const ext = typeof b?.extends === 'string' ? b.extends : '';
  if (!ext) return [];
  for (const reports of ws.reportSets.value) {
    if (!reports) continue;
    const inline = reports.find((r) => r.source === `inline:${name}`);
    if (inline?.extends?.source === ext && inline.extends.files?.length)
      return inline.extends.files;
    const direct = reports.find((r) => r.source === ext);
    if (direct?.files?.length) return direct.files;
  }
  const art = vendorArtifactFor(name, b, ws.reportSets.value);
  return art.digest ? (artifactLists.value.get(art.digest) ?? null) : null;
}

const bundleDoc = computed<PolicyBundleDoc | null>(() =>
  sel.bundle ? (ops.bundles.value[sel.bundle] ?? null) : null,
);
const fileBundle = computed(() =>
  sel.bundle ? ops.fileBundle(sel.bundle) : null,
);
const overlayBundle = computed(() =>
  sel.bundle ? ops.overlayBundle(sel.bundle) : null,
);
const artifact = computed(() =>
  sel.bundle
    ? vendorArtifactFor(sel.bundle, bundleDoc.value, ws.reportSets.value)
    : { digest: null, miss: null },
);
const vendorFiles = computed(() =>
  sel.bundle ? vendorFilesOf(sel.bundle) : null,
);
watch(
  [vendorFiles, () => artifact.value.digest],
  ([files, digest]) => {
    if (files === null && digest) ensureArtifactList(digest);
  },
  { immediate: true },
);
const rows = computed<FileRow[]>(() =>
  bundleDoc.value
    ? bundleFileStates(vendorFiles.value, fileBundle.value, overlayBundle.value)
    : [],
);
const selectedRow = computed(
  () => rows.value.find((r) => r.path === sel.file) ?? null,
);
const provenance = computed(() =>
  bundleProvenance(
    sel.bundle ?? '',
    ws.placeholderBase.value ?? {},
    draft.overlay.value,
  ),
);
const usedBy = computed(() => (sel.bundle ? ops.usedBy(sel.bundle) : []));

/** Files of a source loaded directly (center column when a source is selected). */
const sourceFiles = computed<PolicyFileReport[] | null>(() => {
  if (!sel.source) return null;
  for (const reports of ws.reportSets.value) {
    const direct = (reports ?? []).find((r) => r.source === sel.source);
    if (direct?.files?.length) return direct.files;
  }
  const digest = sourceDigest(sel.source);
  return digest ? (artifactLists.value.get(digest) ?? null) : null;
});
function sourceDigest(source: string): string | null {
  for (const reports of ws.reportSets.value) {
    const d = sourceArtifact(source, reports);
    if (d) return d;
  }
  return null;
}
watch(
  () => (sel.source ? sourceDigest(sel.source) : null),
  (d) => {
    if (d && sourceFiles.value === null) ensureArtifactList(d);
  },
  { immediate: true },
);

// ---- Diagnostics (R63, R89): the API's (preview, 422, report), with positions ----
const reportInstance = computed(
  () =>
    ws.state.instances.value.find(
      (i) => i.instanceId === ws.placeholderInstanceId.value,
    ) ?? null,
);
const desiredEffective = computed(() =>
  mergePatch<ConfigDoc>(
    ws.placeholderBase.value ?? {},
    ws.ctx.config.value.overlay ?? {},
  ),
);
function diagnosticsFor(bundle: string, path: string): PolicyError[] {
  return moduleDiagnostics(
    bundle,
    path,
    ws.preview.lastPreview.value,
    ws.savePolicyErrors.value,
    {
      instance: reportInstance.value,
      desiredRevision: ws.ctx.config.value.revision,
      unchanged: (b, p) => {
        const ptr = pointer('policy_bundles', b, 'modules', p);
        return (
          getAt(draft.effectiveDraft.value, ptr) ===
          getAt(desiredEffective.value, ptr)
        );
      },
    },
  );
}

/**
 * R75/R88: the policy warnings the validation-set instances report on the revision they run
 * (e.g. policy-stream-forked; an empty path is bundle-level), tagged with the hostname when
 * there are several.
 */
const reportedProblems = computed<PolicyError[]>(() => {
  const ids = new Set(validationInstanceIds(ws.state.instances.value));
  const insts = ws.state.instances.value.filter((i) => ids.has(i.instanceId));
  const many = insts.length > 1;
  return insts.flatMap((i) =>
    i.policyErrors
      .filter((e) => e.severity === 'warning')
      .map((e) =>
        many && i.hostname
          ? { ...e, message: `${e.message} (on ${i.hostname})` }
          : e,
      ),
  );
});
const problemKey = (e: PolicyError) =>
  `${e.bundle}|${e.path}|${e.row ?? ''}|${e.code ?? ''}|${e.message}`;
function dedupe(list: PolicyError[]): PolicyError[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    const k = problemKey(e);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
/** A file's diagnostics plus the reported warnings on it (file counts). */
function fileProblems(bundle: string, path: string): PolicyError[] {
  return dedupe([
    ...diagnosticsFor(bundle, path),
    ...reportedProblems.value.filter(
      (e) => e.bundle === bundle && e.path === path,
    ),
  ]);
}

function count(d: PolicyError[]) {
  return {
    errors: d.filter((x) => x.severity === 'error').length,
    warnings: d.filter((x) => x.severity !== 'error').length,
  };
}
function problemsOfBundle(name: string) {
  const paths = new Set<string>([
    ...Object.keys(ops.bundles.value[name]?.modules ?? {}),
    ...(ws.preview.lastPreview.value?.policyErrors ?? [])
      .filter((e) => e.bundle === name)
      .map((e) => e.path),
  ]);
  const all = Array.from(paths).flatMap((p) => diagnosticsFor(name, p));
  return count(
    dedupe([
      ...all,
      ...reportedProblems.value.filter((e) => e.bundle === name),
    ]),
  );
}
const problemsByPath = computed(() => {
  const out: Record<string, { errors: number; warnings: number }> = {};
  if (!sel.bundle) return out;
  for (const r of rows.value) {
    const c = count(fileProblems(sel.bundle, r.path));
    if (c.errors || c.warnings) out[r.path] = c;
  }
  return out;
});
const selectedDiagnostics = computed(() =>
  sel.bundle && sel.file ? diagnosticsFor(sel.bundle, sel.file) : [],
);
const allProblems = computed(() =>
  dedupe([
    ...(ws.preview.lastPreview.value?.policyErrors ?? []),
    ...ws.savePolicyErrors.value,
    ...reportedProblems.value,
  ]).sort(
    (a, b) =>
      a.bundle.localeCompare(b.bundle) ||
      a.path.localeCompare(b.path) ||
      (a.row ?? 0) - (b.row ?? 0),
  ),
);
const policyIssues = computed(() =>
  draft.issues.value.filter(
    (i) =>
      isPrefix('/policy_bundles', i.ptr) ||
      /^\/plugins\/[^/]+\/policies/.test(i.ptr),
  ),
);
function openProblem(bundle: string, path: string) {
  if (!ops.bundles.value[bundle]) return;
  selectBundle(bundle);
  // An empty path is bundle-level: selecting the bundle is all there is to open.
  if (path && typeof ops.bundles.value[bundle].modules?.[path] === 'string') {
    sel.file = path;
    sel.mode = 'edit';
  }
}

// ---- Editor contents ----
const vendorView = reactive<{
  loading: boolean;
  text: string | null;
  error: string | null;
}>({ loading: false, text: null, error: null });
let viewSeq = 0;

const editorText = computed(() => {
  if (sel.mode === 'view') return vendorView.text;
  if (!sel.bundle || !sel.file) return null;
  const t = bundleDoc.value?.modules?.[sel.file];
  return typeof t === 'string' ? t : null;
});

function openEdit(path: string) {
  sel.file = path;
  sel.mode = 'edit';
}
function openData() {
  sel.file = null;
  sel.mode = 'data';
}

/** View: the vendor source, read-only (R64), from the artifact routes (R62). */
async function openVendor(path: string) {
  const seq = ++viewSeq;
  sel.file = path;
  sel.mode = 'view';
  vendorView.loading = true;
  vendorView.text = null;
  vendorView.error = null;
  const digest = sel.source ? sourceDigest(sel.source) : artifact.value.digest;
  if (!digest) {
    vendorView.loading = false;
    vendorView.error = sel.source
      ? VENDOR_MISS_TEXT['no-digest']
      : VENDOR_MISS_TEXT[artifact.value.miss ?? 'no-digest'];
    return;
  }
  try {
    const f = await vendor.fileSource(digest, path);
    if (seq !== viewSeq) return;
    vendorView.text = f.source;
  } catch (e) {
    if (seq !== viewSeq) return;
    vendorView.error = VENDOR_MISS_TEXT[vendorLoadError(e)];
  } finally {
    if (seq === viewSeq) vendorView.loading = false;
  }
}

/**
 * Override (R62/R64): pre-fill the current vendor source. Without one (no digest, a 404, or an
 * extends the agents have not reported), confirm and start from the module template — never
 * a body-less stub (§13.1).
 */
const overriding = ref<string | null>(null);
async function override(row: FileRow) {
  const b = sel.bundle;
  if (!b || overriding.value) return;
  const digest = artifact.value.digest;
  let reason: string = VENDOR_MISS_TEXT[artifact.value.miss ?? 'no-digest'];
  // The vendor source as is: nothing is inserted.
  if (digest) {
    overriding.value = row.path;
    try {
      const f = await vendor.fileSource(digest, row.path);
      ops.setModule(b, row.path, f.source);
      selectBundleKeep(b);
      openEdit(row.path);
      return;
    } catch (e) {
      reason = VENDOR_MISS_TEXT[vendorLoadError(e)];
    } finally {
      overriding.value = null;
    }
  }
  confirm.require({
    header: 'Start from the module template?',
    message: `${reason}. Override ${row.path} with the module template instead? It replaces the whole vendor module: keep every rule other files (such as vendor tests) still reference.`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Use the template' },
    accept: () => {
      ops.setModule(
        b,
        row.path,
        moduleTemplate(row.vendor?.package ?? packageForPath(row.path)),
      );
      selectBundleKeep(b);
      openEdit(row.path);
    },
  });
}
/** Keep `b` selected (an async override may finish after the user moved on). */
function selectBundleKeep(b: string) {
  if (sel.bundle !== b) selectBundle(b);
}

/** R64: vendor tests of the overridden package that the bundle still inherits. */
const vendorTestOffer = computed<string[]>(() => {
  const row = selectedRow.value;
  if (!row || row.state !== 'overridden' || !row.inOverlay) return [];
  const pkg =
    row.vendor?.package ??
    /^\s*package\s+([\w.]+)/m.exec(editorText.value ?? '')?.[1] ??
    null;
  return vendorTestsFor(pkg, row.path, vendorFiles.value)
    .filter(
      (t) => rows.value.find((r) => r.path === t.path)?.state === 'inherited',
    )
    .map((t) => t.path);
});
function deleteVendorTests(paths: string[]) {
  if (!sel.bundle) return;
  for (const p of paths) ops.deleteVendorFile(sel.bundle, p);
}

function onAction(a: TreeAction, row: FileRow) {
  const b = sel.bundle;
  if (!b) return;
  switch (a) {
    case 'view':
      openVendor(row.path);
      break;
    case 'edit':
      openEdit(row.path);
      break;
    case 'override':
      override(row);
      break;
    case 'delete':
      ops.deleteVendorFile(b, row.path);
      // The deleted module's text is gone: show the vendor source it no longer overrides.
      if (sel.file === row.path) {
        if (row.vendor) openVendor(row.path);
        else sel.file = null;
      }
      break;
    case 'restore':
      ops.restoreModule(b, row.path);
      break;
    case 'revert-to-vendor':
    case 'drop-file-module':
      ops.revertToVendor(b, row.path);
      break;
    case 'undelete':
      ops.undeleteFile(b, row.path);
      break;
  }
}

function addFile(path: string) {
  if (!sel.bundle) return;
  ops.setModule(
    sel.bundle,
    path,
    path.endsWith('.rego')
      ? moduleTemplate(
          packageForPath(path),
          newModulePolicyId(sel.bundle, path),
        )
      : '',
  );
  openEdit(path);
}

// ---- Bundles ----
const createOpen = ref(false);
const createSource = ref<string | null>(null);
function openCreate(source: string | null) {
  createSource.value = source;
  createOpen.value = true;
}
function onCreate(c: {
  name: string;
  extends?: string;
  assignments: { plugin: string; mode: AssignMode }[];
}) {
  ops.createBundle(c.name, { extends: c.extends });
  for (const a of c.assignments) ops.assign(a.plugin, c.name, a.mode);
  selectBundle(c.name);
  if (!c.extends) openEdit('main.rego');
}

const assignOpen = ref(false);

const assignmentPlugins = computed<AssignmentPlugin[]>(() => {
  const b = sel.bundle;
  const ext = bundleDoc.value?.extends ?? null;
  return ops.pluginNames.value.map((p) => {
    const pols = ops.effectivePolicies(p);
    return {
      name: p,
      usesSource: !!ext && pols.includes(ext),
      assigned: !!b && pols.includes(`inline:${b}`),
      restoresSource: !!b && ops.restoredSource(p, b) !== null,
    };
  });
});
function onAssign(
  changes: { plugin: string; assign: boolean; mode: AssignMode }[],
) {
  const b = sel.bundle;
  if (!b) return;
  for (const c of changes) {
    if (c.assign) ops.assign(c.plugin, b, c.mode);
    else ops.unassign(c.plugin, b);
  }
}

function confirmDelete() {
  const name = sel.bundle;
  if (!name) return;
  const users = ops.usedBy(name);
  confirm.require({
    header: 'Delete bundle',
    message: users.length
      ? `Delete "${name}" and remove inline:${name} from ${users.join(', ')}? This is a pending change until you review and save.`
      : `Delete "${name}"? This is a pending change until you review and save.`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: () => {
      ops.deleteBundle(name);
      sel.file = null;
      sel.mode = null;
    },
  });
}

/** Undo a pending delete: the bundle and the plugin references the delete removed. */
function undoDelete(name: string) {
  draft.revertPointer(pointer('policy_bundles', name));
  const saved = mergePatch<ConfigDoc>(
    ws.placeholderBase.value ?? {},
    draft.original.value,
  );
  for (const [p, plugin] of Object.entries(saved.plugins ?? {})) {
    if (plugin?.policies?.includes(`inline:${name}`))
      draft.revertPointer(pointer('plugins', p, 'policies'));
  }
  selectBundle(name);
}

defineExpose({ sel, override, openVendor, onAction });
</script>
