<script setup lang="ts">
// A plugin's ordered policy sources: move, remove and add. The list is written whole (RFC 7396),
// with each new source's trust across the previewed instances.
import { computed, ref } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { pointer } from '@/utils/agent-config/json-pointer';
import FieldHints from './FieldHints.vue';
import FieldIssues from './FieldIssues.vue';
import { useEditor } from './useEditor';

const props = defineProps<{ plugin: string }>();

const { draft, has, effectiveValue, trustHint } = useEditor();

const ptr = computed(() => pointer('plugins', props.plugin, 'policies'));
const overridden = computed(() => has(ptr.value));
const entries = computed<string[]>(() => {
  const v = effectiveValue(ptr.value);
  return Array.isArray(v) ? (v as string[]) : [];
});
const newEntry = ref('');

const addError = computed(() => {
  const e = newEntry.value.trim();
  if (!e) return '';
  if (entries.value.includes(e)) return 'Already in the list';
  return '';
});
const addBlocked = computed(() => {
  if (addError.value) return 'This source is already in the list.';
  if (!newEntry.value.trim()) return 'Enter a source first.';
  return undefined;
});

function hint(entry: string) {
  return trustHint(ptr.value, entry);
}

/** Arrays replace wholesale (RFC 7396): every write sends the whole list. */
function write(next: string[]) {
  draft.set(ptr.value, next);
}

function move(idx: number, delta: number) {
  const next = [...entries.value];
  const [item] = next.splice(idx, 1);
  next.splice(idx + delta, 0, item);
  write(next);
}

function removeAt(idx: number) {
  write(entries.value.filter((_, i) => i !== idx));
}

function add() {
  const e = newEntry.value.trim();
  if (!e || addError.value) return;
  write([...entries.value, e]);
  newEntry.value = '';
}
</script>

<template>
  <Stack gap="2" :data-test="`policies-${plugin}`">
    <Cluster gap="2">
      <Text as="span" variant="label">Policies</Text>
      <Text v-if="!overridden" as="span" variant="caption">(file value)</Text>
      <FieldHints :ptr="ptr" @reset="draft.unset(ptr)" />
    </Cluster>
    <Stack gap="1">
      <Cluster
        v-for="(entry, idx) in entries"
        :key="`${idx}-${entry}`"
        gap="2"
        :data-entry="entry"
      >
        <Text as="span" variant="caption">{{ idx + 1 }}.</Text>
        <Text as="code" variant="code">{{ entry }}</Text>
        <Cluster gap="1" as="span" data-test="policy-actions">
          <IconButton
            icon="moveUp"
            size="sm"
            :label="`Move ${entry} up`"
            :disabled-reason="idx === 0 ? 'It is already first.' : undefined"
            @click="move(idx, -1)"
          />
          <IconButton
            icon="moveDown"
            size="sm"
            :label="`Move ${entry} down`"
            :disabled-reason="
              idx === entries.length - 1 ? 'It is already last.' : undefined
            "
            @click="move(idx, 1)"
          />
          <IconButton
            icon="delete"
            size="sm"
            :label="`Remove ${entry}`"
            data-test="remove-policy"
            @click="removeAt(idx)"
          />
        </Cluster>
        <StatusBadge
          v-if="hint(entry)"
          :status="
            hint(entry)!.safe === hint(entry)!.total
              ? 'change-safe'
              : 'change-unsafe'
          "
          :label="`Trusted on ${hint(entry)!.safe}/${hint(entry)!.total} instances · ${hint(entry)!.label}`"
          data-test="trust-hint"
        />
      </Cluster>
      <Text v-if="!entries.length" variant="secondary">No policy sources.</Text>
    </Stack>
    <form @submit.prevent="add">
      <Cluster gap="2" align="end">
        <FormField
          :label="`Add a policy source to ${plugin}`"
          :error="addError || undefined"
        >
          <TextInput
            v-model="newEntry"
            placeholder="OCI reference or local path"
            data-test="new-policy"
          />
        </FormField>
        <Button size="sm" type="submit" :disabled-reason="addBlocked"
          >Add</Button
        >
      </Cluster>
    </form>
    <FieldIssues :ptr="ptr" />
  </Stack>
</template>
