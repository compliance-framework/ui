<template>
  <div class="space-y-2" :data-test="`files-${bundle}`">
    <p
      v-if="!vendorKnown && hasExtends"
      class="text-xs text-amber-700 dark:text-amber-300"
      data-test="vendor-unknown"
    >
      The vendor file list appears after an instance reports this bundle. You
      can still add files, or delete vendor files by path.
    </p>
    <ul class="text-xs" role="list">
      <template v-for="item in items" :key="item.key">
        <li
          v-if="item.dir !== null"
          class="mt-2 flex items-center gap-1 font-mono text-gray-500 dark:text-slate-400"
        >
          <i class="pi pi-folder text-[0.7rem]" />{{ item.dir }}/
        </li>
        <li
          v-else-if="item.row"
          class="group flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-1 py-1"
          :class="{
            'bg-sky-50 dark:bg-sky-500/10': item.row.path === selected,
            'pl-4': item.indent,
          }"
          :data-file="item.row.path"
          :data-state="item.row.state"
        >
          <span
            v-if="problems[item.row.path]"
            role="img"
            class="inline-block h-2 w-2 rounded-full"
            :class="
              problems[item.row.path].errors ? 'bg-red-500' : 'bg-amber-500'
            "
            :aria-label="
              problems[item.row.path].errors ? 'Has errors' : 'Has warnings'
            "
            :data-test="
              problems[item.row.path].errors
                ? 'file-error-dot'
                : 'file-warning-dot'
            "
          />
          <button
            type="button"
            class="font-mono hover:underline"
            :class="{
              'line-through': item.row.state === 'deleted',
              'text-gray-500': item.row.state === 'inherited',
            }"
            :data-test="`open-${item.row.path}`"
            @click="primary(item.row)"
          >
            {{ item.name }}
          </button>
          <ConfigPill v-if="item.row.isTest" severity="secondary"
            >test</ConfigPill
          >
          <i
            v-if="item.row.isTest && item.row.vendor"
            v-tooltip.top="VENDOR_TEST_TOOLTIP"
            role="img"
            tabindex="0"
            class="pi pi-info-circle text-[0.7rem] text-gray-400"
            :aria-label="VENDOR_TEST_TOOLTIP"
            data-test="vendor-test-hint"
          />
          <span :class="STATE_CLASSES[item.row.state]" data-test="file-state">{{
            STATE_LABELS[item.row.state]
          }}</span>
          <span class="ml-auto flex flex-wrap gap-2">
            <span
              v-for="a in actionsFor(item.row)"
              :key="a"
              v-tooltip.top="{
                value: editBlocked ?? '',
                disabled: !(a === 'override' && editBlocked),
              }"
            >
              <button
                type="button"
                class="text-sky-700 hover:underline disabled:opacity-40 dark:text-sky-300"
                :disabled="
                  (a !== 'view' && a !== 'edit' && !canEdit) ||
                  (a === 'override' && !!editBlocked)
                "
                :data-action="a"
                @click="$emit('action', a, item.row)"
              >
                {{ actionLabel(a, item.row) }}
              </button>
            </span>
          </span>
        </li>
      </template>
      <li v-if="!rows.length" class="py-1 text-gray-500">No files.</li>
    </ul>

    <form
      v-if="canEdit"
      class="flex flex-wrap items-center gap-2 pt-2"
      @submit.prevent="addFile"
    >
      <InputText
        v-model="newPath"
        size="small"
        class="min-w-0 flex-1 font-mono"
        placeholder="checks/new_policy.rego"
        aria-label="New file path"
        data-test="add-file-path"
      />
      <span
        v-tooltip.top="{ value: editBlocked ?? '', disabled: !editBlocked }"
      >
        <SecondaryButton
          size="small"
          type="submit"
          :disabled="!newPath || !!newPathError || !!editBlocked"
          data-test="add-file"
          >Add file</SecondaryButton
        >
      </span>
      <span
        v-if="newPath && newPathError"
        class="w-full text-xs text-red-600 dark:text-red-400"
        >{{ newPathError }}</span
      >
    </form>
    <form
      v-if="canEdit && hasExtends && !vendorKnown"
      class="flex flex-wrap items-center gap-2"
      @submit.prevent="deleteByPath"
    >
      <InputText
        v-model="deletePath"
        size="small"
        class="min-w-0 flex-1 font-mono"
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
    </form>
  </div>
</template>

<script setup lang="ts">
// The file tree of one bundle (R68): inherited / overridden / added / deleted / dropped files
// with View (vendor source, read-only), Override, Delete, Restore and Add file (R64).
import { computed, ref } from 'vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import type { FileRow, FileState } from '@/utils/agent-config/policy-files';
import { modulePathError } from '@/utils/agent-config/validation';
import ConfigPill from '../config/ConfigPill.vue';
import { FILE_STATE_LABELS, VENDOR_TEST_TOOLTIP } from '../config/constants';

/** Row actions: the FileRow actions plus View (vendor source). */
export type TreeAction =
  | 'view'
  | 'override'
  | 'delete'
  | 'edit'
  | 'restore'
  | 'revert-to-vendor'
  | 'drop-file-module'
  | 'undelete';

const props = defineProps<{
  bundle: string;
  rows: FileRow[];
  vendorKnown: boolean;
  hasExtends: boolean;
  problems: Record<string, { errors: number; warnings: number }>;
  selected: string | null;
  canEdit: boolean;
  /** R79: why files cannot be overridden or added (a plugin using the bundle is too old). */
  editBlocked?: string | null;
}>();
const emit = defineEmits<{
  action: [action: TreeAction, row: FileRow];
  'add-file': [path: string];
  'delete-path': [path: string];
}>();

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

/** Rows grouped under directory headers (paths are sorted). */
const items = computed(() => {
  const out: {
    key: string;
    dir: string | null;
    row?: FileRow;
    name?: string;
    indent?: boolean;
  }[] = [];
  let current = '';
  for (const row of props.rows) {
    const i = row.path.lastIndexOf('/');
    const dir = i >= 0 ? row.path.slice(0, i) : '';
    if (dir && dir !== current) out.push({ key: `dir:${dir}`, dir });
    current = dir;
    out.push({
      key: row.path,
      dir: null,
      row,
      name: i >= 0 ? row.path.slice(i + 1) : row.path,
      indent: !!dir,
    });
  }
  return out;
});

function actionsFor(row: FileRow): TreeAction[] {
  const out: TreeAction[] = [];
  // Vendor sources are viewable read-only for every row that has a vendor file.
  if (row.vendor) out.push('view');
  for (const a of row.actions) if (a !== 'edit') out.push(a);
  return out;
}

function actionLabel(a: TreeAction, row: FileRow): string {
  switch (a) {
    case 'view':
      return 'View';
    case 'override':
      return 'Override';
    case 'delete':
      return 'Delete';
    case 'edit':
      return 'Open';
    case 'restore':
      return row.state === 'added' ? 'Remove' : 'Restore';
    case 'revert-to-vendor':
      return 'Restore vendor';
    case 'drop-file-module':
      return 'Drop';
    case 'undelete':
      return 'Restore';
  }
}

/** Clicking a name opens the module text when there is one, else the vendor source. */
function primary(row: FileRow) {
  if (row.actions.includes('edit')) emit('action', 'edit', row);
  else if (row.vendor) emit('action', 'view', row);
}

const newPath = ref('');
const newPathError = computed(() => {
  if (!newPath.value) return '';
  if (props.rows.some((r) => r.path === newPath.value && r.state !== 'deleted'))
    return 'A file with this path exists';
  return modulePathError(newPath.value) ?? '';
});
function addFile() {
  if (!newPath.value || newPathError.value || props.editBlocked) return;
  emit('add-file', newPath.value);
  newPath.value = '';
}

const deletePath = ref('');
const deletePathError = computed(() =>
  deletePath.value ? (modulePathError(deletePath.value) ?? '') : '',
);
function deleteByPath() {
  if (!deletePath.value || deletePathError.value) return;
  emit('delete-path', deletePath.value);
  deletePath.value = '';
}
</script>
