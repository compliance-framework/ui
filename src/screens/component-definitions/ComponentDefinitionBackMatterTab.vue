<script setup lang="ts">
/**
 * A component definition's Back matter tab: its reference resources (citations and links), with
 * Add resource. The script is the classic page's.
 */
import { computed, ref } from 'vue';
import type { BackMatterResource, BackMatter } from '@/oscal';
import { useRoute } from 'vue-router';
import Button from '@/ds/components/Button/Button.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import BackMatterResourceForm from './BackMatterResourceForm.vue';
import { useDataApi } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const createDenied = computed(() =>
  can(RESOURCES.COMPONENT_DEFINITION, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include changing component definitions.",
);

const route = useRoute();
const componentDefinitionId = ref<string>(route.params.id as string);
const showCreateModal = ref<boolean>(false);

const { data: backMatter } = useDataApi<BackMatter>(
  `/api/oscal/component-definitions/${componentDefinitionId.value}/back-matter`,
);

function closeCreateModal() {
  showCreateModal.value = false;
}

function handleResourceCreated(resource: BackMatterResource) {
  // Add the new resource to the existing resources
  if (!backMatter.value) {
    backMatter.value = { resources: [] };
  }
  if (!backMatter.value.resources) {
    backMatter.value.resources = [];
  }
  backMatter.value.resources.push(resource);
}

const facts = (resource: BackMatterResource) => [
  { key: 'description', label: 'Description', value: resource.description },
  { key: 'remarks', label: 'Remarks', value: resource.remarks },
  { key: 'citation', label: 'Citation', value: resource.citation?.text },
  { key: 'links', label: 'Links', value: resource.rlinks?.length ? ' ' : '' },
  { key: 'uuid', label: 'UUID', value: resource.uuid },
];
</script>

<template>
  <Stack gap="5">
    <div>
      <Button
        icon="add"
        :disabled-reason="createDenied"
        @click="showCreateModal = true"
        >Add resource</Button
      >
    </div>
    <template v-if="backMatter?.resources?.length">
      <Panel
        v-for="resource in backMatter.resources"
        :key="resource.uuid"
        :title="resource.title || 'Untitled resource'"
        :level="2"
      >
        <DescriptionList :items="facts(resource)" layout="stacked">
          <template v-if="resource.rlinks?.length" #value-links>
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
      </Panel>
    </template>
    <Text v-else
      >No back matter yet. Back matter holds the documents and links this
      definition cites.</Text
    >
    <Dialog v-model:open="showCreateModal" title="New resource">
      <BackMatterResourceForm
        :component-definition-id="componentDefinitionId"
        :existing="backMatter?.resources ?? []"
        @cancel="closeCreateModal"
        @created="
          (resource) => {
            handleResourceCreated(resource);
            closeCreateModal();
          }
        "
      />
    </Dialog>
  </Stack>
</template>
