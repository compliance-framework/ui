<script setup lang="ts">
/**
 * A POA&M record tab listing one collection of the plan: items, observations, risks or findings
 * (see poamCollections.ts; the kind is the route's last path segment), as a RecordCollection.
 * POA&M items also link findings, observations and risks, and show their details and
 * links; risks also open their own page.
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { POAMItem } from '@/oscal';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS } from '@/constants/permissions';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import PoamItemFacts from './PoamItemFacts.vue';
import PoamItemLinksForm from './PoamItemLinksForm.vue';
import RecordCollection from '../RecordCollection.vue';
import type { CollectionEntry } from '../collectionKind';
import { POAM_COLLECTIONS } from './poamCollections';

const route = useRoute();
const { can } = usePermissions();

const poamId = route.params.id as string;
const kind = POAM_COLLECTIONS[route.path.split('/').pop()!]!;
const url = `/api/oscal/plan-of-action-and-milestones/${poamId}/${kind.path}`;
const isItems = kind.path === 'poam-items';

const attaching = ref<POAMItem>();
const attachOpen = computed({
  get: () => Boolean(attaching.value),
  set: (open: boolean) => {
    if (!open) attaching.value = undefined;
  },
});

function extraActions(entry: CollectionEntry): MenuEntry[] {
  if (kind.path === 'risks' && entry.uuid)
    return [
      {
        label: 'Open risk',
        icon: 'next',
        to: {
          name: 'plan-of-action-and-milestones-risk-detail',
          params: { id: poamId, riskId: entry.uuid },
        },
      },
    ];
  if (isItems)
    return [
      {
        label: 'Link findings, observations, risks',
        icon: 'link',
        disabledReason: can(kind.resource, ACTIONS.UPDATE)
          ? undefined
          : `Your access doesn't include changing ${kind.plural}.`,
        onSelect: () => (attaching.value = entry as POAMItem),
      },
    ];
  return [];
}
</script>

<template>
  <RecordCollection
    :kind="kind"
    :url="url"
    :form-props="{ poamId }"
    icon="assessments"
    :extra-actions="extraActions"
  >
    <template v-if="isItems" #details="{ entry }">
      <PoamItemFacts :item="entry as POAMItem" :poam-id="poamId" />
    </template>
    <template v-if="isItems" #dialogs="{ saved }">
      <Dialog
        v-model:open="attachOpen"
        :title="`Findings, observations and risks behind ${attaching?.title ?? 'the item'}`"
      >
        <PoamItemLinksForm
          v-if="attaching"
          :poam-id="poamId"
          :item="attaching"
          @cancel="attaching = undefined"
          @saved="
            (item: POAMItem) => {
              saved(item);
              attaching = undefined;
            }
          "
        />
      </Dialog>
    </template>
  </RecordCollection>
</template>
