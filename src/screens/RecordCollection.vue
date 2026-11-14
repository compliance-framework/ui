<script setup lang="ts">
/**
 * One collection inside a record (see collectionKind.ts): New, then each entry as a disclosure
 * with its tags and facts and a menu to edit, download or delete it. Callers add actions with
 * `extraActions`, content with the `details` slot (given the entry, once it is opened) and dialogs
 * with the `dialogs` slot, and are told of changes to entries through `saved`. The create and edit
 * forms are classic islands in design-system dialogs; edit forms may emit `saved` or `updated`.
 */
import { computed, defineAsyncComponent, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS } from '@/constants/permissions';
import { downloadJson } from '@/utils/download-json';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import type { IconName } from '@/ds/components/Icon/icons';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import type { CollectionEntry, CollectionKind } from './collectionKind';

const props = withDefaults(
  defineProps<{
    kind: CollectionKind;
    /** The collection's API path: GET lists it, `${url}/${uuid}` deletes an entry. */
    url: string;
    /** The record's id, as the forms take it, e.g. `{ sspId }`. */
    formProps: Record<string, unknown>;
    icon?: IconName;
    extraActions?: (entry: CollectionEntry) => MenuEntry[];
  }>(),
  { icon: 'details', extraActions: () => [] },
);

defineSlots<{
  details?: (scope: { entry: CollectionEntry }) => unknown;
  dialogs?: (scope: { saved: (entry: CollectionEntry) => void }) => unknown;
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const CreateForm = defineAsyncComponent(props.kind.createForm);
const EditForm = defineAsyncComponent(props.kind.editForm);

const denied = (action: string, verb: string) =>
  can(props.kind.resource, action)
    ? undefined
    : `Your access doesn't include ${verb} ${props.kind.plural}.`;

const entries = useApiQuery<CollectionEntry[]>(props.url, {
  isEmpty: (list) => list.length === 0,
});

const title = (entry: CollectionEntry) =>
  props.kind.title?.(entry as never) ||
  entry.title ||
  `Untitled ${props.kind.noun}`;
const tags = (entry: CollectionEntry) => props.kind.tags(entry as never);
const facts = (entry: CollectionEntry) => props.kind.facts(entry as never);

/** Open entries; details render only once opened. */
const open = ref<Record<string, boolean>>({});

// Create, edit and delete --------------------------------------------------------------------

const creating = ref(false);
const editing = ref<CollectionEntry>();
const deleting = ref<CollectionEntry>();
const dialogModel = (target: typeof editing) =>
  computed({
    get: () => Boolean(target.value),
    set: (value: boolean) => {
      if (!value) target.value = undefined;
    },
  });
const editOpen = dialogModel(editing);
const deleteOpen = dialogModel(deleting);

function created(entry: CollectionEntry) {
  entries.data.value = [...(entries.data.value ?? []), entry];
  creating.value = false;
}

function saved(entry: CollectionEntry) {
  entries.data.value = (entries.data.value ?? []).map((e) =>
    e.uuid === entry.uuid ? entry : e,
  );
  editing.value = undefined;
}

async function remove() {
  const entry = deleting.value;
  deleting.value = undefined;
  if (!entry?.uuid) return;
  const noun = props.kind.noun;
  try {
    await api.delete(`${props.url}/${entry.uuid}`);
    entries.data.value = (entries.data.value ?? []).filter(
      (e) => e.uuid !== entry.uuid,
    );
    toast.add({
      severity: 'success',
      summary: `${noun[0]!.toUpperCase()}${noun.slice(1)} deleted`,
      detail: `${title(entry)} was deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `The ${noun} wasn't deleted`,
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function actions(entry: CollectionEntry): MenuEntry[] {
  return [
    ...props.extraActions(entry),
    {
      label: `Edit ${props.kind.noun}`,
      icon: 'edit',
      disabledReason: denied(ACTIONS.UPDATE, 'changing'),
      onSelect: () => (editing.value = entry),
    },
    ...(props.kind.download
      ? [
          {
            label: 'Download JSON',
            icon: 'download' as const,
            onSelect: () =>
              downloadJson(
                `${props.kind.noun.replace(/\W+/g, '-')}-${entry.uuid}.json`,
                entry,
              ),
          },
        ]
      : []),
    {
      label: `Delete ${props.kind.noun}`,
      icon: 'delete',
      tone: 'danger',
      disabledReason: denied(ACTIONS.DELETE, 'deleting'),
      onSelect: () => (deleting.value = entry),
    },
  ];
}
</script>

<template>
  <Stack gap="5">
    <div>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="denied(ACTIONS.CREATE, 'adding')"
        @click="creating = true"
        >New {{ kind.noun }}</Button
      >
    </div>
    <DataState
      :status="entries.status.value"
      :subject="kind.plural"
      :empty-title="`No ${kind.plural} yet`"
      :empty-body="kind.emptyBody"
      :icon="icon"
      @retry="entries.retry"
    >
      <Stack gap="3">
        <Disclosure
          v-for="entry in entries.data.value"
          :key="entry.uuid"
          v-model:open="open[entry.uuid!]"
          :label="title(entry)"
        >
          <Stack gap="4">
            <Cluster justify="between" gap="2">
              <Cluster gap="1">
                <Tag v-for="tag in tags(entry)" :key="tag" :label="tag" />
              </Cluster>
              <Menu
                :label="`Actions for ${title(entry)}`"
                :items="actions(entry)"
              />
            </Cluster>
            <DescriptionList
              v-if="facts(entry).length"
              :items="facts(entry)"
              layout="stacked"
            />
            <slot v-if="open[entry.uuid!]" name="details" :entry="entry" />
          </Stack>
        </Disclosure>
      </Stack>
    </DataState>

    <Dialog v-model:open="creating" :title="`New ${kind.noun}`" size="l">
      <component :is="kind.designSystemForms ? 'div' : LegacyPage">
        <CreateForm
          v-bind="formProps"
          @cancel="creating = false"
          @created="created"
        />
      </component>
    </Dialog>
    <Dialog v-model:open="editOpen" :title="`Edit ${kind.noun}`" size="l">
      <component :is="kind.designSystemForms ? 'div' : LegacyPage">
        <EditForm
          v-if="editing"
          v-bind="{ ...formProps, [kind.editProp]: editing }"
          @cancel="editing = undefined"
          @saved="saved"
          @updated="saved"
        />
      </component>
    </Dialog>
    <slot name="dialogs" :saved="saved" />
    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="`Delete ${deleting ? title(deleting) : kind.noun}?`"
      :confirm-label="`Delete ${kind.noun}`"
      @confirm="remove"
      ><Text>This can't be undone.</Text></ConfirmDialog
    >
  </Stack>
</template>
