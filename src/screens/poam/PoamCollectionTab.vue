<script setup lang="ts">
/**
 * A POA&M record tab listing one collection of the plan: items, observations, risks or findings
 * (see poamCollections.ts; the kind is the route's last path segment). Each entry is a disclosure
 * with its tags and facts, and a menu to edit or delete it; POA&M items also attach and detach
 * findings, observations and risks, and show their details and milestones, and risks open their
 * own page. The forms and the item details are classic islands.
 */
import { computed, defineAsyncComponent, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { POAMItem } from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS } from '@/constants/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import PoamItemDetails from '@/components/poam/PoamItemDetails.vue';
import PoamItemAttachModal from '@/components/poam/PoamItemAttachModal.vue';
import { POAM_COLLECTIONS, type PoamEntry } from './poamCollections';

const route = useRoute();
const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const poamId = route.params.id as string;
const kind = POAM_COLLECTIONS[route.path.split('/').pop()!]!;
const base = `/api/oscal/plan-of-action-and-milestones/${poamId}/${kind.path}`;
const isItems = kind.path === 'poam-items';

const CreateForm = defineAsyncComponent(kind.createForm);
const EditForm = defineAsyncComponent(kind.editForm);

const denied = (action: string, verb: string) =>
  can(kind.resource, action)
    ? undefined
    : `Your access doesn't include ${verb} ${kind.plural}.`;
const createDenied = computed(() => denied(ACTIONS.CREATE, 'adding'));

const entries = useApiQuery<PoamEntry[]>(base, {
  isEmpty: (list) => list.length === 0,
});

const title = (entry: PoamEntry) => entry.title || `Untitled ${kind.noun}`;
const tags = (entry: PoamEntry) => kind.tags(entry as never);
const facts = (entry: PoamEntry) => kind.facts(entry as never);

/** Open entries; POA&M item details load only once opened. */
const open = ref<Record<string, boolean>>({});

// Create, edit, attach and delete ------------------------------------------------------------

const creating = ref(false);
const editing = ref<PoamEntry>();
const attaching = ref<POAMItem>();
const deleting = ref<PoamEntry>();
const dialogModel = (target: typeof editing) =>
  computed({
    get: () => Boolean(target.value),
    set: (value: boolean) => {
      if (!value) target.value = undefined;
    },
  });
const editOpen = dialogModel(editing);
const attachOpen = dialogModel(attaching as typeof editing);
const deleteOpen = dialogModel(deleting);

function created(entry: PoamEntry) {
  entries.data.value = [...(entries.data.value ?? []), entry];
  creating.value = false;
}

function saved(entry: PoamEntry) {
  entries.data.value = (entries.data.value ?? []).map((e) =>
    e.uuid === entry.uuid ? entry : e,
  );
  editing.value = undefined;
  attaching.value = undefined;
}

async function remove() {
  const entry = deleting.value;
  deleting.value = undefined;
  if (!entry?.uuid) return;
  try {
    await api.delete(`${base}/${entry.uuid}`);
    entries.data.value = (entries.data.value ?? []).filter(
      (e) => e.uuid !== entry.uuid,
    );
    toast.add({
      severity: 'success',
      summary: `${kind.noun[0]!.toUpperCase()}${kind.noun.slice(1)} deleted`,
      detail: `${title(entry)} was deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `The ${kind.noun} wasn't deleted`,
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function actions(entry: PoamEntry): MenuEntry[] {
  const updateDenied = denied(ACTIONS.UPDATE, 'changing');
  return [
    ...(kind.path === 'risks' && entry.uuid
      ? [
          {
            label: 'Open risk',
            icon: 'next' as const,
            to: {
              name: 'plan-of-action-and-milestones-risk-detail',
              params: { id: poamId, riskId: entry.uuid },
            },
          },
        ]
      : []),
    ...(isItems
      ? [
          {
            label: 'Attach or detach',
            icon: 'link' as const,
            disabledReason: updateDenied,
            onSelect: () => (attaching.value = entry as POAMItem),
          },
        ]
      : []),
    {
      label: `Edit ${kind.noun}`,
      icon: 'edit',
      disabledReason: updateDenied,
      onSelect: () => (editing.value = entry),
    },
    {
      label: `Delete ${kind.noun}`,
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
        :disabled-reason="createDenied"
        @click="creating = true"
        >New {{ kind.noun }}</Button
      >
    </div>
    <DataState
      :status="entries.status.value"
      :subject="kind.plural"
      :empty-title="`No ${kind.plural} yet`"
      :empty-body="kind.emptyBody"
      icon="assessments"
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
            <LegacyPage v-if="isItems && open[entry.uuid!]">
              <PoamItemDetails :item="entry as POAMItem" :poam-id="poamId" />
            </LegacyPage>
          </Stack>
        </Disclosure>
      </Stack>
    </DataState>

    <Dialog v-model:open="creating" :title="`New ${kind.noun}`" size="l">
      <LegacyPage>
        <CreateForm
          :poam-id="poamId"
          @cancel="creating = false"
          @created="created"
        />
      </LegacyPage>
    </Dialog>
    <Dialog v-model:open="editOpen" :title="`Edit ${kind.noun}`" size="l">
      <LegacyPage>
        <EditForm
          v-if="editing"
          :poam-id="poamId"
          v-bind="{ [kind.editProp]: editing }"
          @cancel="editing = undefined"
          @saved="saved"
        />
      </LegacyPage>
    </Dialog>
    <Dialog
      v-if="isItems"
      v-model:open="attachOpen"
      title="Attach or detach findings, observations and risks"
      size="l"
    >
      <LegacyPage>
        <PoamItemAttachModal
          v-if="attaching"
          :poam-id="poamId"
          :item="attaching"
          @cancel="attaching = undefined"
          @saved="saved"
        />
      </LegacyPage>
    </Dialog>
    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="`Delete ${deleting ? title(deleting) : kind.noun}?`"
      :confirm-label="`Delete ${kind.noun}`"
      @confirm="remove"
      ><Text>This can't be undone.</Text></ConfirmDialog
    >
  </Stack>
</template>
