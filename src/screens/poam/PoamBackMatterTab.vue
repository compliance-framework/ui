<script setup lang="ts">
/**
 * A POA&M's Back matter tab: its resources (citations, links, document IDs, embedded files), each
 * a disclosure with its facts and a menu to edit or delete it. The resource form is a classic
 * island in a design-system dialog.
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { BackMatter, BackMatterResource } from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
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
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import BackMatterResourceForm from '@/components/poam/BackMatterResourceForm.vue';

const route = useRoute();
const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const poamId = route.params.id as string;
const base = `/api/oscal/plan-of-action-and-milestones/${poamId}/back-matter`;

const denied = (action: string, verb: string) =>
  can(RESOURCES.POAM_OSCAL, action)
    ? undefined
    : `Your access doesn't include ${verb} POA&M back matter.`;

const backMatter = useApiQuery<BackMatter>(base, {
  notFoundIsEmpty: true,
  isEmpty: (data) => !data.resources?.length,
});
const resources = computed(() => backMatter.data.value?.resources ?? []);

const title = (resource: BackMatterResource) =>
  resource.title || 'Untitled resource';

const facts = (resource: BackMatterResource) => [
  { key: 'description', label: 'Description', value: resource.description },
  {
    key: 'documentIds',
    label: 'Document IDs',
    value: (resource.documentIds ?? [])
      .map((d) => (d.scheme ? `${d.scheme}: ${d.identifier}` : d.identifier))
      .join(', '),
  },
  { key: 'citation', label: 'Citation', value: resource.citation?.text },
  { key: 'links', label: 'Links', value: resource.rlinks?.length ? ' ' : '' },
  {
    key: 'embedded',
    label: 'Embedded file',
    value: resource.base64?.value
      ? [resource.base64.filename, resource.base64.mediaType]
          .filter(Boolean)
          .join(' · ') || 'Unnamed file'
      : '',
  },
  {
    key: 'props',
    label: 'Properties',
    value: (resource.props ?? [])
      .map((p) => `${p.name}: ${p.value}`)
      .join(', '),
  },
  { key: 'remarks', label: 'Remarks', value: resource.remarks },
  { key: 'uuid', label: 'UUID', value: resource.uuid },
];

// Create, edit and delete --------------------------------------------------------------------

/** The resource the form edits; `null` while adding one. */
const editing = ref<BackMatterResource | null>();
const formOpen = computed({
  get: () => editing.value !== undefined,
  set: (open: boolean) => {
    if (!open) editing.value = undefined;
  },
});
const deleting = ref<BackMatterResource>();
const deleteOpen = computed({
  get: () => Boolean(deleting.value),
  set: (open: boolean) => {
    if (!open) deleting.value = undefined;
  },
});

function saved(resource: BackMatterResource) {
  const list = resources.value;
  const next = list.some((r) => r.uuid === resource.uuid)
    ? list.map((r) => (r.uuid === resource.uuid ? resource : r))
    : [...list, resource];
  backMatter.data.value = { ...backMatter.data.value, resources: next };
  toast.add({
    severity: 'success',
    summary: editing.value ? 'Resource saved' : 'Resource added',
    detail: `${title(resource)} was saved.`,
    life: 3000,
  });
  editing.value = undefined;
}

async function remove() {
  const resource = deleting.value;
  deleting.value = undefined;
  if (!resource) return;
  try {
    await api.delete(`${base}/resources/${resource.uuid}`);
    backMatter.data.value = {
      ...backMatter.data.value,
      resources: resources.value.filter((r) => r.uuid !== resource.uuid),
    };
    toast.add({
      severity: 'success',
      summary: 'Resource deleted',
      detail: `${title(resource)} was deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The resource wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

const actions = (resource: BackMatterResource): MenuEntry[] => [
  {
    label: 'Edit resource',
    icon: 'edit',
    disabledReason: denied(ACTIONS.UPDATE, 'changing'),
    onSelect: () => (editing.value = { ...resource }),
  },
  {
    label: 'Delete resource',
    icon: 'delete',
    tone: 'danger',
    disabledReason: denied(ACTIONS.DELETE, 'deleting'),
    onSelect: () => (deleting.value = resource),
  },
];
</script>

<template>
  <Stack gap="5">
    <div>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="denied(ACTIONS.CREATE, 'adding to')"
        @click="editing = null"
        >New resource</Button
      >
    </div>
    <DataState
      :status="backMatter.status.value"
      subject="back matter"
      empty-title="No back matter yet"
      empty-body="Back matter holds the documents, links and files this plan cites."
      icon="source"
      @retry="backMatter.retry"
    >
      <Stack gap="3">
        <Disclosure
          v-for="resource in resources"
          :key="resource.uuid"
          :label="title(resource)"
        >
          <Stack gap="4">
            <Cluster justify="end">
              <Menu
                :label="`Actions for ${title(resource)}`"
                :items="actions(resource)"
              />
            </Cluster>
            <DescriptionList :items="facts(resource)" layout="stacked">
              <template #value-links>
                <Stack gap="1">
                  <TextLink
                    v-for="link in resource.rlinks"
                    :key="link.href"
                    :href="link.href"
                    >{{ link.href
                    }}<template v-if="link.mediaType">
                      ({{ link.mediaType }})</template
                    ></TextLink
                  >
                </Stack>
              </template>
            </DescriptionList>
          </Stack>
        </Disclosure>
      </Stack>
    </DataState>

    <Dialog
      v-model:open="formOpen"
      :title="editing ? 'Edit resource' : 'New resource'"
      size="l"
    >
      <LegacyPage>
        <BackMatterResourceForm
          v-if="formOpen"
          :poam-id="poamId"
          :resource="editing"
          :is-edit="Boolean(editing)"
          @cancel="editing = undefined"
          @saved="saved"
        />
      </LegacyPage>
    </Dialog>
    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="`Delete ${deleting ? title(deleting) : 'this resource'}?`"
      confirm-label="Delete resource"
      @confirm="remove"
      ><Text>This can't be undone.</Text></ConfirmDialog
    >
  </Stack>
</template>
