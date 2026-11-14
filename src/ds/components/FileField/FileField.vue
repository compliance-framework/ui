<script setup lang="ts">
import { computed, useId, useTemplateRef, watch } from 'vue';
import Button from '../Button/Button.vue';
import FieldValue from '../FormField/FieldValue.vue';
import { useFieldControl } from '../FormField/field';

/**
 * One file, e.g. a boundary diagram or an import (F-20, F-35). A native file input, so the
 * keyboard and the system picker work as usual; inside a FormField it takes the label, hint, error
 * and required wiring, standalone it needs `label`. The chosen file shows by name and size, never
 * "1 file selected", with "Remove file" to clear it. Read-only shows the file name or "No file".
 * Put the accepted types in the FormField hint, e.g. "PNG, SVG or draw.io".
 * With `multiple`, it takes several files through `v-model:files` instead, each listed by name and
 * size, with "Remove files" to clear them.
 */
const props = withDefaults(
  defineProps<{ accept: string; label?: string; multiple?: boolean }>(),
  { label: undefined, multiple: false },
);
const model = defineModel<File | null>({ default: null });
const files = defineModel<File[]>('files', { default: () => [] });
const { controlAttrs, invalid, readonly } = useFieldControl(() => props.label);

const input = useTemplateRef<HTMLInputElement>('input');
const fileId = useId();
const size = computed(() => (model.value ? formatSize(model.value.size) : ''));

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// A file set by the screen (e.g. one saved earlier) goes into the native input too, so screen
// readers hear the same file name that is shown.
watch([input, model], ([element, file]) => {
  if (props.multiple || !element || (element.files?.[0] ?? null) === file)
    return;
  const transfer = new DataTransfer();
  if (file) transfer.items.add(file);
  element.files = transfer.files;
});

function onChange(event: Event): void {
  const chosen = (event.target as HTMLInputElement).files;
  if (props.multiple) files.value = Array.from(chosen ?? []);
  else model.value = chosen?.[0] ?? null;
}

function clear(): void {
  if (props.multiple) {
    files.value = [];
    if (input.value) input.value.value = '';
  } else model.value = null;
  input.value?.focus();
}
</script>

<template>
  <FieldValue
    v-if="readonly"
    :value="
      multiple
        ? files.map((f) => f.name).join(', ') || 'No files'
        : (model?.name ?? 'No file')
    "
  />
  <div v-else class="file-field">
    <input
      ref="input"
      v-bind="controlAttrs"
      type="file"
      class="file-field__control"
      :class="{ 'file-field__control--invalid': invalid }"
      :accept="accept"
      :multiple="multiple"
      @change="onChange"
    />
    <div v-if="multiple && files.length" class="file-field__chosen">
      <ul :id="fileId" class="file-field__files">
        <li v-for="file in files" :key="file.name" class="file-field__file">
          {{ file.name }} · {{ formatSize(file.size) }}
        </li>
      </ul>
      <Button
        variant="tertiary"
        size="sm"
        icon="close"
        :aria-describedby="fileId"
        @click="clear"
        >Remove files</Button
      >
    </div>
    <div v-else-if="!multiple && model" class="file-field__chosen">
      <span :id="fileId" class="file-field__file"
        >{{ model.name }} · {{ size }}</span
      >
      <Button
        variant="tertiary"
        size="sm"
        icon="close"
        :aria-describedby="fileId"
        @click="clear"
        >Remove file</Button
      >
    </div>
  </div>
</template>

<style scoped>
.file-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ds-space-1);
  min-width: 0;
}

.file-field__files {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.file-field__chosen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-1) var(--ds-space-2);
  min-width: 0;
}

/* Only the button shows: the browser's own "No file chosen" text collapses, and the chosen file is
   shown by name and size beside it instead. */
.file-field__control {
  max-width: 100%;
  margin: 0;
  font-size: 0;
  cursor: pointer;
}

.file-field__control::file-selector-button {
  height: var(--ds-size-control-md);
  margin: 0;
  padding: 0 var(--ds-space-4);
  background: var(--ds-color-action-secondary-bg);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
  color: var(--ds-color-text-primary);
  font-family: var(--ds-font-ui);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-tight);
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.file-field__control:hover::file-selector-button {
  background: var(--ds-color-action-secondary-bg-hover);
}

.file-field__control--invalid::file-selector-button {
  border-color: var(--ds-color-status-error-fg);
}

.file-field__file {
  min-width: 0;
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
}
</style>
