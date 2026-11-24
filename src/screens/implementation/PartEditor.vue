<script setup lang="ts">
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { ByComponent, ImplementedRequirement, Statement } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import {
  implementationStatusOptionsWithNone,
  normalizeByComponentImplementationStatus,
} from '@/views/control-implementations/partials/implementation-status';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useToast } from '@/ds/toasts';
import { useControlTree } from './controlTree';

/**
 * Edits, in place, what implements one part of a control (or the whole control): its remarks
 * (what the statement, or for the whole control the implementation, says beyond its components),
 * each component's status and text, unlinking components, and linking the plan's components, found by typing. New
 * components are made in Configure System → Components, linked from here in a new tab; the list
 * refreshes each time the search opens, so one made there can be linked straight away. Saving
 * creates the control's implementation and the part's statement if they don't exist yet. The API
 * can't add a component to the whole control, only to a part, so whole-control components can be
 * changed or removed.
 */
const props = defineProps<{
  controlId: string;
  /** The part's ID (`ac-2_smt.a`); unset for the whole control. */
  partId?: string;
  /** The part's statement, if there is one; ignored for the whole control. */
  statement?: Statement;
  /** The statement's remarks, or for the whole control the implementation's. */
  remarks?: string;
  byComponents: ByComponent[];
}>();
const emit = defineEmits<{ done: [] }>();

const tree = useControlTree();
const api = useAuthenticatedInstance();
const toast = useToast();

interface Row {
  key: string;
  original?: ByComponent;
  componentUuid: string;
  state: string;
  description: string;
  removed: boolean;
}
const rows = ref<Row[]>(
  props.byComponents.map((bc) => ({
    key: bc.uuid,
    original: bc,
    componentUuid: bc.componentUuid,
    state: bc.implementationStatus?.state?.trim().toLowerCase() ?? '',
    description: bc.description,
    removed: false,
  })),
);
const remarks = ref(props.remarks ?? '');
const shown = computed(() => rows.value.filter((row) => !row.removed));
const errors = ref<Record<string, string>>({});
const saving = ref(false);
const canAdd = computed(() => Boolean(props.partId));

const titleOf = (uuid: string) =>
  tree.component(uuid)?.title ?? 'A component not in this plan';
/** The plan's components a new row can choose: not already in this part. */
function choices(row: Row) {
  const taken = new Set(
    shown.value.filter((r) => r !== row).map((r) => r.componentUuid),
  );
  return tree
    .components()
    .filter((c) => !taken.has(c.uuid))
    .map((c) => ({ value: c.uuid, label: c.title }));
}

function link(): void {
  rows.value.push({
    key: uuidv4(),
    componentUuid: '',
    state: '',
    description: '',
    removed: false,
  });
}
function remove(row: Row): void {
  if (row.original) row.removed = true;
  else rows.value = rows.value.filter((r) => r !== row);
}

function validate(): boolean {
  const next: Record<string, string> = {};
  for (const row of shown.value) {
    if (!row.componentUuid)
      next[`${row.key}:component`] = 'Choose a component.';
    if (!row.description.trim())
      next[`${row.key}:description`] = 'Say how the component implements this.';
  }
  errors.value = next;
  return !Object.keys(next).length;
}

const withStatus = (bc: ByComponent, state: string) =>
  normalizeByComponentImplementationStatus({
    ...bc,
    implementationStatus: { ...bc.implementationStatus, state },
  });

async function save(): Promise<void> {
  if (!validate()) return;
  saving.value = true;
  const base = `/api/oscal/system-security-plans/${tree.sspId()}/control-implementation/implemented-requirements`;
  const send = { transformRequest: [decamelizeKeys] };
  // Remarks go first, sent with the rest of their statement (or implementation) as it was, so the
  // component changes after them aren't overwritten.
  const newRemarks = remarks.value.trim() || undefined;
  const remarksChanged = newRemarks !== (props.remarks?.trim() || undefined);
  try {
    let requirement = tree.implementation(props.controlId);
    if (!requirement) {
      const created = await api.post<{ data: ImplementedRequirement }>(
        base,
        {
          uuid: uuidv4(),
          controlId: props.controlId,
          remarks: props.partId ? undefined : newRemarks,
        },
        send,
      );
      requirement = created.data.data;
    } else if (!props.partId && remarksChanged) {
      await api.put(
        `${base}/${requirement.uuid}`,
        { ...requirement, remarks: newRemarks },
        send,
      );
    }
    let target = `${base}/${requirement.uuid}/by-components`;
    if (props.partId) {
      let statementUuid = props.statement?.uuid;
      if (!statementUuid && (shown.value.length || newRemarks)) {
        const created = await api.post<{ data: Statement }>(
          `${base}/${requirement.uuid}/statements`,
          { uuid: uuidv4(), statementId: props.partId, remarks: newRemarks },
          send,
        );
        statementUuid = created.data.data.uuid;
      } else if (props.statement && remarksChanged) {
        await api.put(
          `${base}/${requirement.uuid}/statements/${props.statement.uuid}`,
          { ...props.statement, remarks: newRemarks },
          send,
        );
      }
      target = `${base}/${requirement.uuid}/statements/${statementUuid}/by-components`;
    }
    for (const row of rows.value) {
      const { original } = row;
      if (original && row.removed) {
        await api.delete(`${target}/${original.uuid}`);
      } else if (original) {
        const state = original.implementationStatus?.state ?? '';
        if (row.description === original.description && row.state === state)
          continue;
        await api.put(
          `${target}/${original.uuid}`,
          withStatus({ ...original, description: row.description }, row.state),
          send,
        );
      } else {
        await api.post(
          target,
          withStatus(
            {
              uuid: uuidv4(),
              componentUuid: row.componentUuid,
              description: row.description,
            },
            row.state,
          ),
          send,
        );
      }
    }
    await tree.reload();
    toast.add({ severity: 'success', summary: 'Implementation saved' });
    emit('done');
  } catch (error) {
    // Some changes may have saved before the failure: show what the API now has.
    await tree.reload().catch(() => undefined);
    toast.add({
      severity: 'error',
      summary: "The implementation wasn't saved",
      detail: await getErrorDetail(error, 'Try again.'),
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Stack gap="4">
    <FormField
      label="Remarks"
      :hint="
        partId
          ? 'About this part as a whole, beyond what each component does.'
          : 'About the whole control, beyond what each component does.'
      "
    >
      <Textarea v-model="remarks" auto-grow />
    </FormField>
    <Text as="span" variant="label">By component</Text>
    <Stack v-if="shown.length" as="ul" gap="5">
      <li v-for="row in shown" :key="row.key">
        <Stack gap="2">
          <Cluster gap="2" justify="between">
            <Text v-if="row.original" as="strong">{{
              titleOf(row.componentUuid)
            }}</Text>
            <Text v-else as="strong">Link a component</Text>
            <IconButton
              icon="unlink"
              :label="`Unlink ${row.original ? titleOf(row.componentUuid) : 'this component'}`"
              @click="remove(row)"
            />
          </Cluster>
          <FormField
            v-if="!row.original"
            label="Component"
            :error="errors[`${row.key}:component`]"
            required
          >
            <Combobox
              v-model="row.componentUuid"
              :options="choices(row)"
              placeholder="Type a component's name"
              empty-text="No component in this plan matches."
              @update:open="(open) => open && tree.refreshComponents()"
            />
          </FormField>
          <Text v-if="!row.original" variant="caption"
            >Not in the plan yet?
            <TextLink :to="tree.newComponentLink()" target="_blank"
              >Create a component (opens in a new tab)</TextLink
            >, then search again.</Text
          >
          <FormField label="Status">
            <Select
              v-model="row.state"
              :options="implementationStatusOptionsWithNone"
            />
          </FormField>
          <FormField
            label="How it implements this"
            :error="errors[`${row.key}:description`]"
            required
          >
            <Textarea v-model="row.description" auto-grow />
          </FormField>
        </Stack>
      </li>
    </Stack>
    <Text v-else variant="secondary">No component implements this yet.</Text>
    <Cluster v-if="canAdd">
      <Button icon="link" size="sm" @click="link">Link a component</Button>
    </Cluster>
    <Cluster gap="2">
      <Button variant="primary" :loading="saving" @click="save">Save</Button>
      <Button
        :disabled-reason="saving ? 'Saving…' : undefined"
        @click="emit('done')"
        >Cancel</Button
      >
    </Cluster>
  </Stack>
</template>
