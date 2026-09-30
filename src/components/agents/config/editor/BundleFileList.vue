<template>
  <div class="space-y-2" :data-test="`files-${bundle}`">
    <p
      v-if="!vendorKnown && hasExtends"
      class="text-xs text-amber-700 dark:text-amber-300"
      data-test="vendor-unknown"
    >
      The vendor file list appears after an instance reports this bundle. You
      can still override or delete files by path.
    </p>
    <table class="w-full text-left text-xs">
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.path"
          class="border-t border-ccf-300 align-middle dark:border-slate-700"
          :class="{ 'bg-sky-50 dark:bg-sky-500/10': row.path === selected }"
          :data-file="row.path"
          :data-state="row.state"
        >
          <td class="py-1 pr-2">
            <span
              v-if="problems[row.path]"
              class="mr-1 inline-block h-2 w-2 rounded-full"
              :class="problems[row.path].errors ? 'bg-red-500' : 'bg-amber-500'"
              :data-test="
                problems[row.path].errors
                  ? 'file-error-dot'
                  : 'file-warning-dot'
              "
            />
            <span
              v-if="row.inOverlay"
              v-tooltip.top="'Set in the overlay'"
              class="mr-1 inline-block h-2 w-2 rounded-full bg-sky-500"
              data-test="overlay-dot"
            />
            <span
              class="font-mono"
              :class="{ 'line-through': row.state === 'deleted' }"
              >{{ row.path }}</span
            >
            <ConfigPill v-if="row.isTest" severity="secondary" class="ml-1"
              >test</ConfigPill
            >
            <i
              v-if="row.isTest && row.vendor && row.state === 'inherited'"
              v-tooltip.top="VENDOR_TEST_TOOLTIP"
              class="pi pi-info-circle ml-1 text-[0.7rem] text-gray-400"
              :aria-label="VENDOR_TEST_TOOLTIP"
              data-test="vendor-test-hint"
            />
            <span v-if="row.vendor?.package" class="ml-2 text-gray-400">{{
              row.vendor.package
            }}</span>
          </td>
          <td class="py-1 pr-2">
            <span :class="STATE_CLASSES[row.state]" data-test="file-state">{{
              STATE_LABELS[row.state]
            }}</span>
          </td>
          <td class="py-1 text-right whitespace-nowrap">
            <button
              v-for="a in row.actions"
              :key="a"
              type="button"
              class="ml-2 text-sky-700 hover:underline dark:text-sky-300"
              :data-action="a"
              @click="act(a, row)"
            >
              {{ actionLabel(a, row) }}
            </button>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td class="py-1 text-gray-500">No files.</td>
        </tr>
      </tbody>
    </table>

    <form class="flex flex-wrap items-center gap-2" @submit.prevent="addFile">
      <InputText
        v-model="newPath"
        size="small"
        class="w-64 font-mono"
        placeholder="checks/new.rego"
        aria-label="New file path"
        data-test="add-file-path"
      />
      <SecondaryButton
        size="small"
        type="submit"
        :disabled="!newPath || !!newPathError"
        data-test="add-file"
        >Add file</SecondaryButton
      >
      <span
        v-if="newPath && newPathError"
        class="text-xs text-red-600 dark:text-red-400"
        >{{ newPathError }}</span
      >
    </form>
    <form
      v-if="hasExtends && !vendorKnown"
      class="flex flex-wrap items-center gap-2"
      @submit.prevent="deleteByPath"
    >
      <InputText
        v-model="deletePath"
        size="small"
        class="w-64 font-mono"
        placeholder="vendor/file.rego"
        aria-label="Vendor path to delete"
        data-test="delete-path"
      />
      <SecondaryButton
        size="small"
        type="submit"
        :disabled="!deletePath || !!deletePathError"
        data-test="delete-by-path"
      >
        Delete by path
      </SecondaryButton>
      <span
        v-if="deletePath && deletePathError"
        class="text-xs text-red-600 dark:text-red-400"
        >{{ deletePathError }}</span
      >
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import type {
  FileAction,
  FileRow,
  FileState,
} from '@/utils/agent-config/policy-files';
import { modulePathError } from '@/utils/agent-config/validation';
import ConfigPill from '../ConfigPill.vue';
import { FILE_STATE_LABELS } from '../constants';
import { regoSkeleton, type BundleOps } from './useBundleOps';

const props = defineProps<{
  bundle: string;
  rows: FileRow[];
  vendorKnown: boolean;
  hasExtends: boolean;
  problems: Record<string, { errors: number; warnings: number }>;
  selected: string | null;
  ops: BundleOps;
}>();
const emit = defineEmits<{ select: [path: string | null] }>();

const VENDOR_TEST_TOOLTIP =
  'Vendor test failures are warnings and never reject a revision. Delete the file to stop running it.';

const STATE_LABELS = FILE_STATE_LABELS as Record<FileState, string>;
const STATE_CLASSES: Record<FileState, string> = {
  inherited: 'text-gray-500',
  overridden: 'text-sky-700 dark:text-sky-300',
  deleted: 'text-red-600 dark:text-red-400',
  added: 'text-green-700 dark:text-green-300',
  'delete-missing': 'text-amber-700 dark:text-amber-300',
  set: 'text-sky-700 dark:text-sky-300',
  conflict: 'text-red-600 dark:text-red-400 font-semibold',
  dropped: 'text-gray-500 italic',
};

function actionLabel(a: FileAction, row: FileRow): string {
  switch (a) {
    case 'override':
      return 'Override';
    case 'delete':
      return 'Delete';
    case 'edit':
      return 'Edit';
    case 'restore':
      return row.state === 'added' ? 'Remove' : 'Restore';
    case 'revert-to-vendor':
      return 'Revert to vendor';
    case 'drop-file-module':
      return 'Drop file module';
    case 'undelete':
      return 'Undelete';
  }
}

function act(a: FileAction, row: FileRow) {
  const b = props.bundle;
  switch (a) {
    case 'override': {
      // Pre-fill: the vendor package line (vendor source pre-fill needs evidence-v3, deferred).
      const pkg = row.vendor?.package ?? 'compliance_framework.';
      props.ops.setModule(b, row.path, regoSkeleton(pkg));
      emit('select', row.path);
      break;
    }
    case 'edit':
      emit('select', row.path);
      break;
    case 'delete':
      props.ops.deleteVendorFile(b, row.path);
      if (props.selected === row.path) emit('select', null);
      break;
    case 'restore':
      props.ops.restoreModule(b, row.path);
      break;
    case 'revert-to-vendor':
    case 'drop-file-module':
      props.ops.revertToVendor(b, row.path);
      break;
    case 'undelete':
      props.ops.undeleteFile(b, row.path);
      break;
  }
}

const newPath = ref('');
const newPathError = computed(() => {
  if (!newPath.value) return '';
  if (
    props.rows.some((r) => r.path === newPath.value && r.state !== 'deleted')
  ) {
    return 'A file with this path exists';
  }
  return modulePathError(newPath.value) ?? '';
});
function addFile() {
  if (!newPath.value || newPathError.value) return;
  const p = newPath.value;
  const stem = p.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_]/g, '_');
  props.ops.setModule(
    props.bundle,
    p,
    p.endsWith('.rego') ? regoSkeleton(`compliance_framework.${stem}`) : '',
  );
  emit('select', p);
  newPath.value = '';
}

const deletePath = ref('');
const deletePathError = computed(() =>
  deletePath.value ? (modulePathError(deletePath.value) ?? '') : '',
);
function deleteByPath() {
  if (!deletePath.value || deletePathError.value) return;
  props.ops.deleteVendorFile(props.bundle, deletePath.value);
  deletePath.value = '';
}
</script>
