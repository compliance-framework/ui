<template>
  <KeyValueEditor
    :label="field"
    :rows="rows"
    :warn-keys="field === 'config'"
    :test-id="`${field}-${plugin}`"
    @set="setValue"
    @add="(k, v) => draft.set(p(k), v)"
    @reset="(k) => draft.unset(p(k))"
    @delete="(k) => draft.makeAbsent(p(k))"
  />
  <FieldIssues v-for="r in rows" :key="r.key" :ptr="p(r.key)" />
</template>

<script setup lang="ts">
// Inline editor of a plugin's `config` or `labels` map (R69): add, change, reset to the file
// value or remove keys. Values are strings (R27). Each row carries its R71 access: a key no
// reporting instance would apply (e.g. no overridable_config_flags entry anywhere) is
// read-only with a lock, one only some would apply gets a shield.
import { computed } from 'vue';
import { pointer } from '@/utils/agent-config/json-pointer';
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import { provenanceOf } from '@/utils/agent-config/provenance';
import { REDACTED_MASK } from '@/types/agent-config';
import { accessTooltip } from '@/utils/agent-config/field-access';
import KeyValueEditor, { type KeyValueRow } from '../editor/KeyValueEditor.vue';
import FieldIssues from '../editor/FieldIssues.vue';
import { useEditor } from '../editor/useEditor';
import { setStringKey } from './emptyValue';

const props = defineProps<{ plugin: string; field: 'config' | 'labels' }>();

const { draft, ctx, baseValue, overlayValue, access, shield } = useEditor();

function p(key?: string): string {
  return key === undefined
    ? pointer('plugins', props.plugin, props.field)
    : pointer('plugins', props.plugin, props.field, key);
}

const rows = computed<KeyValueRow[]>(() => {
  const base = baseValue(p());
  const ov = overlayValue(p());
  const keys = new Set<string>([
    ...Object.keys(isPlainObject(base) ? base : {}),
    ...Object.keys(isPlainObject(ov) ? ov : {}),
  ]);
  return Array.from(keys)
    .sort()
    .map((k) => {
      const ptr = p(k);
      const bv = isPlainObject(base) ? base[k] : undefined;
      const oVal = isPlainObject(ov) ? ov[k] : undefined;
      const acc = access(ptr);
      const locked = acc.state === 'readonly';
      return {
        key: k,
        value: typeof oVal === 'string' ? oVal : '',
        placeholder:
          bv === REDACTED_MASK
            ? 'masked; type a new value'
            : typeof bv === 'string'
              ? bv
              : '',
        provenance: provenanceOf(
          ptr,
          ctx.placeholderBase.value ?? {},
          draft.overlay.value,
        ),
        removed: isPlainObject(ov) && oVal === null,
        locked,
        lockTooltip: locked ? accessTooltip(acc) : undefined,
        restricted: acc.state === 'restricted' ? accessTooltip(acc) : undefined,
        shield: shield(ptr),
      };
    });
});

/** An emptied value: the file value again when a file defines the key (emptyValue.ts). */
function setValue(k: string, v: string) {
  setStringKey(draft, [ctx.placeholderBase.value, ...ctx.bases.value], p(k), v);
}
</script>
